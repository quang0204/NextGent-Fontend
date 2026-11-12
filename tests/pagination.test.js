import test from 'node:test';
import assert from 'node:assert/strict';

test('Pagination: 24 items with pageSize 10 calculates 3 pages and correct slices', () => {
  const totalItems = 24;
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  assert.equal(totalPages, 3);

  // Page 1
  let safePage = 1;
  let startItem = (safePage - 1) * pageSize + 1;
  let endItem = Math.min(safePage * pageSize, totalItems);
  assert.equal(startItem, 1);
  assert.equal(endItem, 10);

  // Page 3
  safePage = 3;
  startItem = (safePage - 1) * pageSize + 1;
  endItem = Math.min(safePage * pageSize, totalItems);
  assert.equal(startItem, 21);
  assert.equal(endItem, 24);

  // Page list generator
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  assert.deepEqual(pages, [1, 2, 3]);
});
