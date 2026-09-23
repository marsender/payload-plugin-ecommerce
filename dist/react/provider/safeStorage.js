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
 */ const store = ()=>{
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return window.localStorage;
    } catch  {
        return null;
    }
};
export const safeLocalStorage = {
    getItem: (key)=>{
        try {
            return store()?.getItem(key) ?? null;
        } catch  {
            return null;
        }
    },
    removeItem: (key)=>{
        try {
            store()?.removeItem(key);
        } catch  {
        /* nothing was stored to remove */ }
    },
    setItem: (key, value)=>{
        try {
            // Also swallows QuotaExceededError, which iOS raises on a full store.
            store()?.setItem(key, value);
        } catch  {
        /* the cart is simply not remembered across loads */ }
    }
};

//# sourceMappingURL=safeStorage.js.map