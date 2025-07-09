### **The Transcendence Frontend Cheatsheet: From Systems Architect to Next.js Master**

#### **I. The Core Philosophy: Server-First Rendering**

**The Old Way (Forbidden):**
The browser gets an empty HTML shell, then runs JavaScript (`useEffect`) to fetch data and render the UI. This is the "Client-Side Rendering" (CSR) or "Single-Page App" (SPA) model. It is inefficient and what we just purged.

**The New Way (Our Standard):**
The server does the heavy lifting. It fetches data and renders the page to HTML *before* sending it to the browser. The browser receives a near-complete page, resulting in superior performance and a better user experience. This is "Server-Side Rendering" (SSR) and "Server Components."

---

#### **II. The Two Component Types: The Fundamental Distinction**

| Feature | `async` Server Components (The Default) | `'use client';` Components (The Exception) |
| :--- | :--- | :--- |
| **Marker** | **No marker.** They are the default. | Must have `'use client';` at the very top. |
| **Where it Runs** | **Server-only.** The code is never sent to the browser. | Renders first on the server, then "hydrates" and runs in the browser. |
| **Data Fetching** | **Direct.** Can `await` data fetches directly. Can access the database, use server-side libraries (`fs`, `db`), and read environment variables securely. | **Indirect.** Cannot `await` data fetches. Uses `useEffect` or a data-fetching library (like SWR/TanStack Query) to fetch from an API route. |
| **State & Interactivity** | **Stateless.** Cannot use `useState`, `useEffect`, or any browser-based hooks. | **Stateful.** This is their entire purpose. Use them for any component that needs to react to user input (`onClick`, `onChange`, forms, etc.). |
| **Passing Props** | Can pass props to Client Components. | **Critical:** Cannot import a Server Component directly. Can only receive Server Components as `{children}` props. |
| **When to Use** | **Everything.** Pages, layouts, data-display components, footers, headers. Your default choice for 90% of your UI. | **"Islands of Interactivity."** Buttons, forms, dropdowns, interactive charts, anything that needs `useState`. Keep them as small and specific as possible. |

**The Golden Rule:** Start everything as a Server Component. Only add `'use client';` when you absolutely need browser-based interactivity.

---

#### **III. Data Fetching Patterns: The New Standard Operating Procedure**

| Scenario | The Correct Pattern | Example |
| :--- | :--- | :--- |
| **Fetching data for a page** | Use an `async` Server Component page. | `export default async function Page() { const data = await fetch(...); return <UI data={data} />; }` |
| **Fetching data in a layout** | Use an `async` Server Component layout. | `export default async function Layout({ children }) { const user = await getUser(); return <Navbar user={user}>{children}</Navbar>; }` |
| **Fetching data triggered by user action (e.g., a search button)** | The interactive component (`'use client';`) calls an API Route Handler. | `// Client Button.tsx <button onClick={...} /> // Server API Route /api/search/route.ts export async function GET() { ... }` |
| **Accessing Cookies / Headers** | Use the `cookies()` or `headers()` functions from `next/headers` inside a Server Component. | `import { cookies } from 'next/headers'; const token = cookies().get('token')?.value;` |

**The Anti-Pattern (Forbidden):** Using `useEffect` to fetch initial page data. This is a relic of the old way and is now obsolete in our architecture.

---

#### **IV. The Tailwind CSS Doctrine: Utilities, Not Components**

**The Old Way (Forbidden):**
Creating custom, semantic class names in a `.css` file.
*JSX:* `<div class="profile-card">`
*CSS:* `.profile-card { background-color: white; ... }`

**The New Way (Our Standard):**
Composing styles directly in the JSX using utility classes provided by Tailwind.
*JSX Only:* `<div className="bg-white rounded-lg shadow-md p-4">`

**Key Principles:**
1.  **Purge `globals.css`:** It should contain only the `@import "tailwindcss";` directive and nothing else.
2.  **Embrace Composition:** Combine many small utilities (`flex`, `p-4`, `text-lg`, `font-bold`) to create your UI.
3.  **Create UI Primitives:** For complex, reused elements like buttons or cards, encapsulate the Tailwind classes into a reusable React component (e.g., `app/components/ui/Button.tsx`). This is how we achieve consistency and DRY (Don't Repeat Yourself) principles with Tailwind. Use `cva` (Class Variance Authority) for variants (e.g., primary vs. secondary buttons).

---

#### **V. The Project Structure: A Quick Reference**

```
/app
├── (protected)/        # Authenticated Routes (Server-first)
├── (public)/           # Public Routes (Login, Register)
├── components/         # Reusable Components
│   ├── ui/             #   -> Primitives (Button, Input) - The "Lego bricks"
│   └── (specific)/     #   -> Complex components (AppNavbar, ChatWindow) - The "Lego models"
├── contexts/           # Global Client-Side State (e.g., AuthContext)
├── lib/                # Helper functions (e.g., utils.ts for cn)
└── api/                # API Route Handlers (Server-side endpoints)
```

