# Category-Brands Junction Table (Many-to-Many) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a fully normalized Many-to-Many relationship between Categories and Brands via a junction table `category_brands` with Foreign Key constraints, expose `categoryIds` in the brand APIs, and filter brands per category in the Mega Menu and Admin Portal.

**Architecture:** 
1. Database: Standard 3NF junction table `category_brands` with composite primary key `(category_id, brand_id)` and `ON DELETE CASCADE` foreign keys.
2. Backend (Spring Boot): `@ManyToMany` mapping between `Brand` and `Category` with entity graph / join fetch to eliminate N+1 queries. `BrandResponse` and `BrandRequest` expose `categoryIds: List<Long>`.
3. Frontend (React / TypeScript): `Brand` interface extended with `categoryIds?: number[]`. `CategoryMegaMenu` filters brands per tab. `PortalBrandsView` provides category checkboxes for Brand management.

**Tech Stack:** MySQL 8.0, Spring Boot 3 / Hibernate / JPA, React 19, TypeScript, Tailwind CSS.

**Spec:** User request to adopt Idea 2 (RDBMS standard junction table) for Brand - Category association so that each category only displays its associated brands, even if a brand currently has no active products in that category.

---

## Global Constraints

- Database table name: `category_brands` (lowercase with underscore).
- Columns: `category_id BIGINT NOT NULL`, `brand_id BIGINT NOT NULL`, Composite PK `(category_id, brand_id)`.
- Foreign Keys: `fk_cb_category` -> `categories(category_id)` ON DELETE CASCADE, `fk_cb_brand` -> `brands(brand_id)` ON DELETE CASCADE.
- API compatibility: `GET /api/v1/brands` continues to return all brand fields with the added `categoryIds: number[]`.
- Zero N+1 queries: Fetching brands with their categories must use a single JOIN or `@EntityGraph`.
- Zero disruption: If a brand has no categories assigned, it gracefully defaults to empty list `[]`.

---

## Review Focus

1. **Brand with multiple categories:** Brands like Apple and Samsung belong to Phone, Tablet, Laptop, and Accessory. Ensure all associated `categoryIds` appear in the API response.
2. **Category deletion cascade:** Deleting a category or brand automatically removes corresponding rows in `category_brands` without database constraint failure or orphaned records.
3. **Empty category brand list:** If a category has no brands assigned yet, MegaMenu displays empty state or graceful fallback without crashing.
4. **Admin Portal updates:** Editing a brand's assigned categories correctly updates the junction table without duplicating or dropping other brand fields (logo, slug, description).
5. **No N+1 query regression:** Fetching brand list should not fire 17 individual queries to `category_brands`.

---

## Tasks

### Task 1: Database Migration - Create `category_brands` Table and Seed Data

**Files:**
- Create: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\resources\db\migration_category_brands.sql`

**Interfaces:**
- Produces: MySQL table `category_brands` populated with accurate relationships for 17 brands.

- [x] **Step 1: Write SQL migration script**
  Create table `category_brands` with composite PK and foreign keys `ON DELETE CASCADE`. Insert initial category mapping for 17 brands based on actual business catalog:
  - Apple (1): Categories 1 (Phone), 2 (Tablet), 3 (Laptop), 4 (Accessory), 15 (Smartwatch)
  - Samsung (2): Categories 1, 2, 4, 15
  - Xiaomi (3): Categories 1, 2, 4, 15
  - Sony (4): Categories 1, 4
  - Asus (5): Category 3
  - Anker (6): Category 4
  - Marshall (7): Category 4
  - Dell (8): Category 3
  - HP (9): Category 3
  - Lenovo (10): Categories 2, 3
  - LG (11): Category 3
  - Google (12): Categories 1, 15
  - Garmin (13): Category 15
  - JBL (14): Category 4
  - Logitech (15): Category 4
  - Baseus (16): Category 4
  - Sennheiser (17): Category 4

- [x] **Step 2: Execute migration script on MySQL `NextGen` database**
  Run script against MySQL `NextGen`.

- [x] **Step 3: Verify table creation and row count**
  Verify table has rows and Foreign Keys are active.

---

### Task 2: Backend Entity, DTO, Mapper, and Repository Updates

**Files:**
- Modify: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\java\com\wedbackendservice\nextgen\module\product\entity\Brand.java`
- Modify: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\java\com\wedbackendservice\nextgen\module\product\dto\client\response\BrandResponse.java`
- Modify: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\java\com\wedbackendservice\nextgen\module\product\dto\portal\request\BrandRequest.java`
- Modify: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\java\com\wedbackendservice\nextgen\module\product\repository\BrandRepository.java`
- Modify: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\java\com\wedbackendservice\nextgen\module\product\mapper\BrandMapper.java`

**Interfaces:**
- Consumes: `Category` entity, `category_brands` table.
- Produces: `Brand.categories: Set<Category>`, `BrandResponse.categoryIds: List<Long>`, `BrandRequest.categoryIds: List<Long>`.

- [x] **Step 1: Add `@ManyToMany` mapping to `Brand.java`**
  ```java
  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
      name = "category_brands",
      joinColumns = @JoinColumn(name = "brand_id"),
      inverseJoinColumns = @JoinColumn(name = "category_id")
  )
  @Builder.Default
  Set<Category> categories = new HashSet<>();
  ```

- [x] **Step 2: Add `categoryIds` to `BrandResponse.java` and `BrandRequest.java`**
  Add `List<Long> categoryIds;` to both DTOs.

- [x] **Step 3: Update `BrandRepository.java` to fetch categories without N+1**
  Add `@EntityGraph(attributePaths = {"categories"})` on `findAllActive()` and `findAll()`.
  Add `List<Brand> findByCategories_CategoryIdAndIsActiveTrue(Long categoryId)`.

- [x] **Step 4: Update `BrandMapper.java`**
  Map `categories` to `categoryIds` (or handle in service).

---

### Task 3: Backend Service and Controller Updates

**Files:**
- Modify: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\java\com\wedbackendservice\nextgen\module\product\service\CategoriesAndBrandsService.java`
- Modify: `c:\Users\ADMIN\Downloads\git nex ver 2\NextGen\src\main\java\com\wedbackendservice\nextgen\module\product\controller\client\BrandsController.java`

**Interfaces:**
- Consumes: Updated `BrandRepository`, `CategoryRepository`.
- Produces: API `GET /api/v1/brands?categoryId=...` returning `categoryIds` in each brand.

- [x] **Step 1: Update `getBrands` in `CategoriesAndBrandsService.java`**
  Set `categoryIds` on `BrandResponse` from `brand.getCategories()`. Support optional `categoryId` filtering.

- [x] **Step 2: Update `getBrandById` in `CategoriesAndBrandsService.java`**
  Include `categoryIds` on single brand lookup.

- [x] **Step 3: Update `createBrand` and `updateBrand` in `CategoriesAndBrandsService.java`**
  When `request.getCategoryIds()` is provided, query categories from `categoryRepository.findAllById(...)` and set `brand.setCategories(new HashSet<>(categories))`.

- [x] **Step 4: Update `BrandsController.java`**
  Add `@RequestParam(required = false) Long categoryId` to `getBrands(...)`.

---

### Task 4: Backend Verification & Compilation

**Files:**
- Test via Maven compile / test command.

- [x] **Step 1: Run Maven compile**
  Run: `mvn compile` in backend directory.
  Expected: BUILD SUCCESS.

- [x] **Step 2: Verify `GET /api/v1/brands` API output**
  Call `http://localhost:8080/nextgen/api/v1/brands` and verify brands include `categoryIds: [1, 2, 3, 4]`.

---

### Task 5: Frontend Types and Services

**Files:**
- Modify: `c:\Users\ADMIN\Downloads\Wed git nhánh phụ\NextGent-Fontend\src\types\product.ts`
- Modify: `c:\Users\ADMIN\Downloads\Wed git nhánh phụ\NextGent-Fontend\src\services\brandService.ts`

**Interfaces:**
- Consumes: Updated backend `BrandResponse`.
- Produces: `categoryIds?: number[]` on `Brand`, `BrandItem`, and `BrandPayload`.

- [x] **Step 1: Update `Brand` in `src/types/product.ts`**
  Add `categoryIds?: number[];`.

- [x] **Step 2: Update `BrandItem` and `BrandPayload` in `src/services/brandService.ts`**
  Add `categoryIds?: number[];` to both interfaces. Add optional `categoryId?: number` to `getBrands(includeHidden, categoryId)`.

---

### Task 6: Frontend CategoryMegaMenu Brand Filtering

**Files:**
- Modify: `c:\Users\ADMIN\Downloads\Wed git nhánh phụ\NextGent-Fontend\src\components\layout\CategoryMegaMenu.tsx`

**Interfaces:**
- Consumes: `Brand.categoryIds`.
- Produces: Filtered brand list in each category tab (Phone -> ID 1, Laptop -> ID 3, Tablet -> ID 2, Accessory -> ID 4).

- [x] **Step 1: Compute category-specific brands in `CategoryMegaMenu.tsx`**
  ```typescript
  const phoneBrands = useMemo(() => brands.filter(b => b.categoryIds?.includes(1)), [brands]);
  const tabletBrands = useMemo(() => brands.filter(b => b.categoryIds?.includes(2)), [brands]);
  const laptopBrands = useMemo(() => brands.filter(b => b.categoryIds?.includes(3)), [brands]);
  const accessoryBrands = useMemo(() => brands.filter(b => b.categoryIds?.includes(4)), [brands]);
  ```
  Fallback: if `b.categoryIds` is undefined or empty for existing data, allow fallback to avoid blank display.

- [x] **Step 2: Replace `brands.map` in each tab with respective filtered list**
  - Tab `phone`: render `phoneBrands.map(...)`
  - Tab `laptop`: render `laptopBrands.map(...)`
  - Tab `tablet`: render `tabletBrands.map(...)`
  - Tab `accessory`: render `accessoryBrands.map(...)`

---

### Task 7: Frontend Admin Portal (PortalBrandsView) Category Assignment

**Files:**
- Modify: `c:\Users\ADMIN\Downloads\Wed git nhánh phụ\NextGent-Fontend\src\pages\portal\PortalBrandsView.tsx`

**Interfaces:**
- Consumes: `categoryService.getCategories()` and `brand.categoryIds`.
- Produces: Interactive category checkboxes in the Create / Edit Brand modal.

- [x] **Step 1: Load categories in `PortalBrandsView` for checkbox selection**
  Fetch categories on modal open and display category checkboxes (Điện thoại, Tablet, Laptop, Phụ kiện, Đồng hồ).

- [x] **Step 2: Bind selected `categoryIds` to Brand form state and submit**
  When editing, populate `selectedCategoryIds` from `editingBrand.categoryIds`. On submit, include `categoryIds: selectedCategoryIds` in `BrandPayload`.

- [x] **Step 3: Display category badges in the Brand table/card list**
  Show small category badges (e.g. "Điện thoại", "Laptop") under brand name for quick overview.

---

### Task 8: End-to-End Build and Browser Verification

**Files:**
- Test via `npm run build` and visual inspection in browser.

- [x] **Step 1: Run frontend build**
  Run: `npm run build` in frontend directory.
  Expected: Build succeeds with 0 TypeScript / ESLint errors.

- [x] **Step 2: Verify in browser**
  Inspect Mega Menu tabs:
  - Phone: Only Apple, Samsung, Xiaomi, Sony, Google. (No Asus, Dell, HP, Marshall, Anker).
  - Laptop: Only Asus, Dell, HP, Lenovo, LG, Apple. (No Anker, Marshall, JBL).
  - Accessory: Only Apple, Samsung, Xiaomi, Sony, Anker, Marshall, JBL, Logitech, Baseus, Sennheiser. (No Dell, HP).
