import test from 'node:test';
import assert from 'node:assert/strict';

test('Product mapping: preserves featured originalPrice/salePrice and defaults soldCount to 0', () => {
  const mapFeatured = (it) => ({
    listPrice: Number(it.maxPrice || it.originalPrice || it.minPrice || it.salePrice || 0),
    salePrice: Number(it.salePrice ?? it.minPrice ?? it.originalPrice ?? 0),
    soldCount: it.soldCount ?? 0,
    isFlashSale: it.isFlashSale ?? Boolean(it.promotion || (it.discountPercent && it.discountPercent > 0)),
  });

  const featuredRes = mapFeatured({
    productId: 1,
    originalPrice: 36990000,
    salePrice: 33990000,
    discountPercent: 8,
    promotion: { promotionId: 1 },
  });
  assert.equal(featuredRes.listPrice, 36990000);
  assert.equal(featuredRes.salePrice, 33990000);
  assert.equal(featuredRes.soldCount, 0);
  assert.equal(featuredRes.isFlashSale, true);
});

test('Order item ROM snapshot: ignores undefined/0GB and avoids undefinedGB bug', () => {
  const formatOrderRom = (it) => {
    if (it?.romSnapshot && it.romSnapshot !== 'undefinedGB' && it.romSnapshot !== '0GB') {
      return String(it.romSnapshot);
    }
    const romVal = Number(it?.romGb || 0);
    return romVal > 0 ? `${romVal}GB` : '';
  };

  assert.equal(formatOrderRom({ romSnapshot: '256GB' }), '256GB');
  assert.equal(formatOrderRom({ romSnapshot: '0GB' }), '');
  assert.equal(formatOrderRom({ romSnapshot: 'undefinedGB', romGb: 128 }), '128GB');
  assert.equal(formatOrderRom({ romGb: 0 }), '');
});

test('Ticket status helpers: treats OPEN/IN_PROGRESS as waiting and CLOSED/REJECTED as rejected', () => {
  const isTicketWaiting = (st) => st === 'WAITING' || st === 'OPEN' || st === 'IN_PROGRESS';
  const isTicketRejected = (st) => st === 'REJECTED' || st === 'CLOSED';

  assert.equal(isTicketWaiting('OPEN'), true);
  assert.equal(isTicketWaiting('IN_PROGRESS'), true);
  assert.equal(isTicketWaiting('WAITING'), true);
  assert.equal(isTicketWaiting('RESOLVED'), false);
  assert.equal(isTicketRejected('OPEN'), false);
  assert.equal(isTicketRejected('CLOSED'), true);
  assert.equal(isTicketRejected('REJECTED'), true);
});

test('Flash sale countdown: calculates HH:MM:SS accurately and clamps at zero', () => {
  const getCountdownParts = (endAt, nowMs) => {
    let targetMs = endAt ? new Date(endAt).getTime() : NaN;
    if (!Number.isFinite(targetMs)) {
      const endOfDay = new Date(nowMs);
      endOfDay.setHours(23, 59, 59, 999);
      targetMs = endOfDay.getTime();
    }
    const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
    const pad = (n) => String(n).padStart(2, '0');
    return {
      hours: pad(Math.floor(diffSec / 3600)),
      minutes: pad(Math.floor((diffSec % 3600) / 60)),
      seconds: pad(diffSec % 60),
    };
  };

  const now = new Date('2026-11-10T10:00:00Z').getTime();
  assert.deepEqual(
    getCountdownParts('2026-11-10T13:24:58Z', now),
    { hours: '03', minutes: '24', seconds: '58' }
  );
  assert.deepEqual(
    getCountdownParts('2026-11-10T13:24:58Z', now + 1000),
    { hours: '03', minutes: '24', seconds: '57' }
  );
  assert.deepEqual(
    getCountdownParts('2026-11-10T09:00:00Z', now),
    { hours: '00', minutes: '00', seconds: '00' }
  );
});

test('Return refund amount: prefers orderTotalAmount after voucher and ignores null refundAmount when PENDING', () => {
  const parseRefundAmount = (raw) => (raw !== null && raw !== undefined ? Number(raw) : undefined);
  const calcSuggestedRefund = (req) => {
    const itemsTotal = (req.items || []).reduce((s, i) => s + Number(i.unitPrice || 0) * Number(i.quantity || 1), 0);
    return req.orderTotalAmount && req.orderTotalAmount > 0 ? req.orderTotalAmount : itemsTotal;
  };

  assert.equal(parseRefundAmount(null), undefined);
  assert.equal(parseRefundAmount(0), 0);
  assert.equal(parseRefundAmount(34990000), 34990000);

  // Voucher case: item sum 25.2M, customer actually paid finalAmount 25.1M
  assert.equal(
    calcSuggestedRefund({ orderTotalAmount: 25100000, items: [{ unitPrice: 25200000, quantity: 1 }] }),
    25100000
  );
  // Fallback when orderTotalAmount not present
  assert.equal(
    calcSuggestedRefund({ items: [{ unitPrice: 3590000, quantity: 1 }] }),
    3590000
  );
});

test('Order return check: REFUNDED/APPROVED/REJECTED/PENDING all surface in return tab with distinct states', () => {
  const resolveReturnStatus = (ord) => {
    const rejectNote = (ord.statusHistory || []).find((h) => {
      const lower = (h.note || '').toLowerCase();
      return lower.includes('đổi trả') && lower.includes('bị từ chối');
    })?.note;
    return ord.returnStatus || (ord.paymentStatus === 'REFUNDED' ? 'APPROVED' : rejectNote ? 'REJECTED' : undefined);
  };

  assert.equal(resolveReturnStatus({ paymentStatus: 'REFUNDED', statusHistory: [] }), 'APPROVED');
  assert.equal(resolveReturnStatus({ returnStatus: 'REJECTED', paymentStatus: 'PAID', statusHistory: [] }), 'REJECTED');
  assert.equal(
    resolveReturnStatus({
      paymentStatus: 'PAID',
      statusHistory: [{ note: 'Yêu cầu đổi trả #RMA-38 bị từ chối: Mất tem' }],
    }),
    'REJECTED'
  );
  assert.equal(resolveReturnStatus({ paymentStatus: 'PAID', statusHistory: [] }), undefined);
});
