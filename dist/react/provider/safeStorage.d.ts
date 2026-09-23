/**
 * `localStorage` that cannot throw.
 *
 * Safari refuses Web Storage outright when the visitor has "Block All Cookies" on, and refuses it
 * as a `SecurityError: The operation is insecure.` raised on the PROPERTY ACCESS —
 * `window.localStorage` itself — not on the read. Neither a `typeof window` guard nor a feature
 * check covers that, and the provider reads the stored cart id from a mount effect: the throw
 * escapes to the nearest error boundary, which for a provider wrapping the whole app is the
 * root one. Every page of the site became the error page for those visitors.
 *
 * A remembered cart id is a convenience — the server holds the cart, and a signed-in customer's
 * cart is found through their account — so each operation degrades to "nothing stored".
 */
export declare const safeLocalStorage: {
    getItem: (key: string) => null | string;
    removeItem: (key: string) => void;
    setItem: (key: string, value: string) => void;
};
//# sourceMappingURL=safeStorage.d.ts.map