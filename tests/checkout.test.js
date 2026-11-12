import test from 'node:test';
import assert from 'node:assert/strict';

test('Checkout: subtotal calculation sums items price * quantity', () => {
  const items = [
    { variantId: 101, unitPrice: 32990000, quantity: 1 },
    { variantId: 102, unitPrice: 4500000, quantity: 2 },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  assert.equal(subtotal, 41990000);
});

test('Checkout: voucher percentage discount with maximum cap', () => {
  const subtotal = 32990000;
  const discountPercent = 10;
  const maxDiscountAmount = 2000000;
  const computedDiscount = Math.min((subtotal * discountPercent) / 100, maxDiscountAmount);
  assert.equal(computedDiscount, 2000000);

  const finalTotal = subtotal - computedDiscount;
  assert.equal(finalTotal, 30990000);
});

test('Inventory: availableQty formula equals max(0, onHandQty - reservedQty)', () => {
  const calcAvailable = (onHand, reserved) => Math.max(0, onHand - reserved);
  assert.equal(calcAvailable(25, 5), 20);
  assert.equal(calcAvailable(5, 5), 0);
  assert.equal(calcAvailable(2, 5), 0);
});
