# Purelane Shopify homepage

A Dawn 15.4.1 customization that recreates the five requested areas from `purelane-homepage.html` as native Shopify Online Store 2.0 sections:

1. Hero
2. Reviews rail
3. Best-selling combos
4. Fixed bundle tiers
5. Product grid

The untouched Dawn import is preserved in Git commit `f699afe`. The supplied HTML was treated as a visual and copy reference, not shipped as storefront code.

## Architecture

The implementation is server-rendered Liquid with progressively enhanced JavaScript:

- `sections/purelane-*.liquid` contains the five merchant-editable homepage sections.
- `snippets/purelane-product-card.liquid` renders live price, availability, ratings and quick add.
- `snippets/purelane-product-media.liquid` handles responsive product media and the missing-image state.
- `assets/purelane.css` contains the scoped Purelane visual system and responsive rules.
- `assets/purelane.js` controls the hero carousel, reveal behavior and theme-editor lifecycle.
- `templates/index.json` installs the five sections in their intended order.
- `layout/theme.liquid` loads the Purelane assets only on the homepage.

No React, backend, database, custom app or client-side product data is used. Dawn continues to own the cart, product forms, product pages, header and footer.

## Connect a development store

The Shopify account, store records, and storefront password cannot live safely in this repository. Complete these steps while signed into the assignment's Shopify Partner account:

1. Create an empty development store, select India, and set store currency to INR.
2. Install the free **Shopify Bundles** app.
3. Install the current Shopify CLI if it is not already available.
4. From this directory, authenticate and preview the local theme:

   ```sh
   shopify theme dev --store your-store.myshopify.com
   ```

5. Upload it as an unpublished theme once the content is configured:

   ```sh
   shopify theme push --unpublished --store your-store.myshopify.com
   ```

Do not commit Shopify credentials, the storefront password, or CLI authentication files.

## Required store data

Create a `Homecare` collection with at least these eight regular products. The names may be adjusted, but preserve all three edge cases.

| Product | Suggested edge state |
| --- | --- |
| Foaming Kitchen Cleaner | Give this an intentionally long marketing title |
| Organic Dishwash Gel | Normal |
| Tap Cleaner & Limescale Remover | Normal |
| Non-toxic Laundry Detergent | Normal |
| Natural Herbal Floor Cleaner | Normal |
| Non-toxic Toilet Cleaner | Set all inventory to zero and disable overselling |
| Gentle Hydrating Liquid Handwash | Normal |
| Washing Machine Cleaner | Leave product media empty |

For the seven products with media, upload the matching imagery from the supplied prototype as Shopify product media. Do not add those images to theme assets: product imagery must remain merchant-managed and flow through Shopify's image CDN.

Create these five **fixed bundle products** with Shopify Bundles:

| Bundle product | Components |
| --- | --- |
| Kitchen Essentials | Kitchen Cleaner, Dishwash Gel, Tap Cleaner |
| Laundry Care Bundle | Laundry Detergent, Fabric Conditioner or Handwash, Washing Machine Cleaner |
| Complete Home Bundle | Kitchen Cleaner, Laundry Detergent, Floor Cleaner, Toilet Cleaner, Handwash |
| Bathroom Deep Clean | Toilet Cleaner, Tap Cleaner, Handwash or another bathroom product |
| Hard Water Solution Kit | Tap Cleaner, Toilet Cleaner |

Set each bundle's price, compare-at price, inventory behavior, description and featured image in Shopify. The theme never hardcodes a selected product's price or stock.

## Metafield definitions

Create these definitions in **Settings → Custom data → Products**:

| Namespace and key | Type | Used on | Purpose |
| --- | --- | --- | --- |
| `custom.card_badge` | Single line text | Regular products | Optional product-card badge |
| `custom.card_benefit` | Single line text | Regular products | Short benefit beneath component imagery |
| `custom.bundle_components` | Product reference, list of products | Fixed bundle products | Components displayed in hero, combo and tier cards |
| `reviews.rating` | Rating, scale 1–5 | Regular products | Product-card rating |
| `reviews.rating_count` | Integer | Regular products | Product-card review count |

The Shopify Bundles app remains the source of bundle inventory and checkout composition. `custom.bundle_components` is a display-only list and should mirror the app's actual components.

## Theme editor setup

In **Online Store → Themes → Customize → Home page**:

1. **Purelane hero:** select one regular product and the two- and three-product fixed bundles for its three offer blocks.
2. **Purelane reviews:** edit, add, remove or reorder testimonial blocks; optionally attach each review to a product.
3. **Purelane combos:** assign all five fixed bundle products and mark the Complete Home Bundle as featured.
4. **Purelane bundle tiers:** assign the two-, three-, and five-product bundles.
5. **Purelane product grid:** select the `Homecare` collection and show eight products.

Marketing copy, labels, benefits, review text, buttons and carousel timing are editor settings. Titles, images, prices, compare-at prices, availability and product URLs come from Shopify.

## QA checklist

Run these checks on the development-store preview before submission:

- View at 375px, 768px, 1024px and 1440px widths.
- Confirm regular single-variant products add to cart and the cart updates.
- Confirm multi-variant products open their product page instead of adding an arbitrary variant.
- Confirm every fixed-bundle CTA opens the correct Shopify product page.
- Confirm the sold-out product cannot be quick-added.
- Confirm the missing-image product shows an accessible placeholder.
- Confirm the long title wraps without overflowing its card.
- Add, remove, edit and reorder blocks in all five sections.
- Select a hero offer block and confirm its slide becomes visible in the editor.
- Navigate links, tabs, carousel dots and product actions using only a keyboard.
- Enable reduced motion and confirm autoplay, marquee motion and reveals stop.
- Run `shopify theme check` from this directory.
- Run mobile Lighthouse against the password-accessible preview URL.
- Test the final URL and password in a logged-out/private browser window.

### Local validation completed

- Homepage and English locale JSON parse successfully.
- All five embedded section schemas parse successfully.
- `node --check assets/purelane.js` passes.
- `git diff --check` passes.
- Shopify CLI Theme Check exits successfully with no offenses in Purelane code. It reports nine warnings from pre-existing Dawn code paths; these do not fail the check.

Store-dependent cart, theme-editor, viewport and Lighthouse checks remain open until this theme is connected to the authenticated development store.

## Intentional omissions

- Bundle products are fixed Shopify Bundles products. There is no misleading “pick any 2/3/5” builder.
- The prototype's header, ticker, ingredients, explainer, newsletter, footer, sticky CTA and category sections are not part of the five-section assignment.
- Mouse parallax and elaborate water animation were omitted in favor of responsive behavior, accessibility and lower script cost.
- Store creation, app installation, Admin data entry, preview authentication and publishing require the store owner's authenticated session and are therefore handoff steps, not repository automation.

## AI workflow note

AI assistance was used to audit the supplied prototype, separate visual reference data from Shopify-owned data, scaffold the Liquid/CSS/JavaScript, and enumerate edge-case QA. The resulting theme still requires human verification in Shopify's theme editor, checkout flow, device breakpoints and logged-out storefront before submission. No test result or completed Admin action is claimed without actually running it.

## Submission checklist

- Development-store URL and storefront password
- GitHub repository with the untouched Dawn baseline and implementation commits
- The five metafield definitions above
- Store products, collection and five fixed bundles
- Completed QA checklist and any known limitations
- Short AI workflow disclosure

Shopify's original Dawn license remains in `LICENSE.md`. The self-hosted Inter and Outfit font files are distributed under the SIL Open Font License by their respective authors.
