'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { deepMergeSimple } from 'payload/shared';
import * as qs from 'qs-esm';
import React, { createContext, use, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
const defaultContext = {
    addItem: async ()=>{},
    clearCart: async ()=>{},
    confirmOrder: async ()=>{},
    createAddress: async ()=>{},
    deleteAddress: async ()=>{},
    currenciesConfig: {
        defaultCurrency: 'USD',
        supportedCurrencies: [
            {
                code: 'USD',
                decimals: 2,
                label: 'US Dollar',
                symbol: '$'
            }
        ]
    },
    currency: {
        code: 'USD',
        decimals: 2,
        label: 'US Dollar',
        symbol: '$'
    },
    decrementItem: async ()=>{},
    incrementItem: async ()=>{},
    initiatePayment: async ()=>{},
    isLoading: false,
    paymentMethods: [],
    refreshUser: async ()=>{},
    removeItem: async ()=>{},
    setCurrency: ()=>{},
    updateAddress: async ()=>{}
};
const EcommerceContext = /*#__PURE__*/ createContext(defaultContext);
const defaultLocalStorage = {
    key: 'cart'
};
export const EcommerceProvider = ({ addressesSlug = 'addresses', api, cartsSlug = 'carts', children, currenciesConfig = {
    defaultCurrency: 'USD',
    supportedCurrencies: [
        {
            code: 'USD',
            decimals: 2,
            label: 'US Dollar',
            symbol: '$'
        }
    ]
}, customersSlug = 'users', debug = false, paymentMethods = [], syncLocalStorage = true })=>{
    const localStorageConfig = syncLocalStorage && typeof syncLocalStorage === 'object' ? {
        ...defaultLocalStorage,
        ...syncLocalStorage
    } : defaultLocalStorage;
    const { apiRoute = '/api', cartsFetchQuery = {}, serverURL = '' } = api || {};
    const baseAPIURL = `${serverURL}${apiRoute}`;
    const [isLoading, startTransition] = useTransition();
    const [user, setUser] = useState(null);
    const [addresses, setAddresses] = useState();
    const hasRendered = useRef(false);
    /**
   * The ID of the cart associated with the current session.
   * This is used to identify the cart in the database or local storage.
   * It can be null if no cart has been created yet.
   */ const [cartID, setCartID] = useState();
    /**
   * The secret for accessing guest carts without authentication.
   * This is generated when a guest user creates a cart.
   */ const [cartSecret, setCartSecret] = useState(undefined);
    const [cart, setCart] = useState();
    const [selectedCurrency, setSelectedCurrency] = useState(()=>currenciesConfig.supportedCurrencies.find((c)=>c.code === currenciesConfig.defaultCurrency));
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const cartQuery = useMemo(()=>{
        const priceField = `priceIn${selectedCurrency.code}`;
        const baseQuery = {
            depth: 0,
            populate: {
                products: {
                    [priceField]: true
                },
                variants: {
                    options: true,
                    [priceField]: true
                }
            },
            select: {
                items: true,
                subtotal: true
            }
        };
        return deepMergeSimple(baseQuery, cartsFetchQuery);
    }, [
        selectedCurrency.code,
        cartsFetchQuery
    ]);
    const createCart = useCallback(async (initialData)=>{
        const query = qs.stringify(cartQuery);
        const response = await fetch(`${baseAPIURL}/${cartsSlug}?${query}`, {
            body: JSON.stringify({
                ...initialData,
                currency: selectedCurrency.code,
                customer: user?.id
            }),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create cart: ${errorText}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Cart creation error: ${data.error}`);
        }
        // Store the secret for guest cart access
        if (!user && data.doc?.secret) {
            setCartSecret(data.doc.secret);
        }
        return data.doc;
    }, [
        baseAPIURL,
        cartQuery,
        cartsSlug,
        selectedCurrency.code,
        user
    ]);
    const getCart = useCallback(async (cartID, options)=>{
        const secret = options?.secret;
        // Build query params with secret if provided
        const queryParams = {
            ...cartQuery,
            ...secret ? {
                secret
            } : {}
        };
        const query = qs.stringify(queryParams);
        const response = await fetch(`${baseAPIURL}/${cartsSlug}/${cartID}?${query}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'GET'
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch cart: ${errorText}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Cart fetch error: ${data.error}`);
        }
        return data;
    }, [
        baseAPIURL,
        cartQuery,
        cartsSlug
    ]);
    const updateCart = useCallback(async (cartID, data)=>{
        // Build query params with secret if provided
        const queryParams = {
            ...cartQuery,
            ...cartSecret ? {
                secret: cartSecret
            } : {}
        };
        const query = qs.stringify(queryParams);
        const response = await fetch(`${baseAPIURL}/${cartsSlug}/${cartID}?${query}`, {
            body: JSON.stringify(data),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'PATCH'
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update cart: ${errorText}`);
        }
        const updatedCart = await response.json();
        setCart(updatedCart.doc);
    }, [
        baseAPIURL,
        cartQuery,
        cartsSlug,
        cartSecret
    ]);
    const deleteCart = useCallback(async (cartID)=>{
        // Build query params with secret if provided
        const queryParams = cartSecret ? {
            secret: cartSecret
        } : {};
        const query = qs.stringify(queryParams);
        const url = `${baseAPIURL}/${cartsSlug}/${cartID}${query ? `?${query}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete cart: ${errorText}`);
        }
        setCart(undefined);
        setCartID(undefined);
        setCartSecret(undefined);
    }, [
        baseAPIURL,
        cartsSlug,
        cartSecret
    ]);
    // Persist cart ID and secret to localStorage
    useEffect(()=>{
        if (hasRendered.current) {
            if (syncLocalStorage) {
                if (cartID) {
                    localStorage.setItem(localStorageConfig.key, cartID);
                } else {
                    localStorage.removeItem(localStorageConfig.key);
                }
                if (cartSecret) {
                    localStorage.setItem(`${localStorageConfig.key}_secret`, cartSecret);
                } else {
                    localStorage.removeItem(`${localStorageConfig.key}_secret`);
                }
            }
        }
    }, [
        cartID,
        cartSecret,
        localStorageConfig.key,
        syncLocalStorage
    ]);
    const addItem = useCallback(async (item, quantity = 1)=>{
        return new Promise((resolve)=>{
            startTransition(async ()=>{
                if (cartID) {
                    const existingCart = await getCart(cartID, {
                        secret: cartSecret
                    });
                    if (!existingCart) {
                        // console.error(`Cart with ID "${cartID}" not found`)
                        setCartID(undefined);
                        setCart(undefined);
                        return;
                    }
                    // Check if the item already exists in the cart
                    const existingItemIndex = existingCart.items?.findIndex((cartItem)=>{
                        const productID = typeof cartItem.product === 'object' ? cartItem.product.id : item.product;
                        const variantID = cartItem.variant && typeof cartItem.variant === 'object' ? cartItem.variant.id : item.variant;
                        return productID === item.product && (item.variant && variantID ? variantID === item.variant : true);
                    }) ?? -1;
                    let updatedItems = existingCart.items ? [
                        ...existingCart.items
                    ] : [];
                    if (existingItemIndex !== -1) {
                        // If the item exists, update its quantity
                        updatedItems[existingItemIndex].quantity = updatedItems[existingItemIndex].quantity + quantity;
                        // Update the cart with the new items
                        await updateCart(cartID, {
                            items: updatedItems
                        });
                    } else {
                        // If the item does not exist, add it to the cart
                        updatedItems = [
                            ...existingCart.items ?? [],
                            {
                                ...item,
                                quantity
                            }
                        ];
                    }
                    // Update the cart with the new items
                    await updateCart(cartID, {
                        items: updatedItems
                    });
                } else {
                    // If no cartID exists, create a new cart
                    const newCart = await createCart({
                        items: [
                            {
                                ...item,
                                quantity
                            }
                        ]
                    });
                    setCartID(newCart.id);
                    setCart(newCart);
                }
                resolve();
            });
        });
    }, [
        cartID,
        cartSecret,
        createCart,
        getCart,
        startTransition,
        updateCart
    ]);
    const removeItem = useCallback(async (targetID)=>{
        return new Promise((resolve)=>{
            startTransition(async ()=>{
                if (!cartID) {
                    resolve();
                    return;
                }
                const existingCart = await getCart(cartID, {
                    secret: cartSecret
                });
                if (!existingCart) {
                    // console.error(`Cart with ID "${cartID}" not found`)
                    setCartID(undefined);
                    setCart(undefined);
                    resolve();
                    return;
                }
                // Check if the item already exists in the cart
                const existingItemIndex = existingCart.items?.findIndex((cartItem)=>cartItem.id === targetID) ?? -1;
                if (existingItemIndex !== -1) {
                    // If the item exists, remove it from the cart
                    const updatedItems = existingCart.items ? [
                        ...existingCart.items
                    ] : [];
                    updatedItems.splice(existingItemIndex, 1);
                    // Update the cart with the new items
                    await updateCart(cartID, {
                        items: updatedItems
                    });
                }
                resolve();
            });
        });
    }, [
        cartID,
        cartSecret,
        getCart,
        startTransition,
        updateCart
    ]);
    const incrementItem = useCallback(async (targetID)=>{
        return new Promise((resolve)=>{
            startTransition(async ()=>{
                if (!cartID) {
                    resolve();
                    return;
                }
                const existingCart = await getCart(cartID, {
                    secret: cartSecret
                });
                if (!existingCart) {
                    // console.error(`Cart with ID "${cartID}" not found`)
                    setCartID(undefined);
                    setCart(undefined);
                    resolve();
                    return;
                }
                // Check if the item already exists in the cart
                const existingItemIndex = existingCart.items?.findIndex((cartItem)=>cartItem.id === targetID) ?? -1;
                let updatedItems = existingCart.items ? [
                    ...existingCart.items
                ] : [];
                if (existingItemIndex !== -1) {
                    // If the item exists, increment its quantity
                    updatedItems[existingItemIndex].quantity = updatedItems[existingItemIndex].quantity + 1; // Increment by 1
                    // Update the cart with the new items
                    await updateCart(cartID, {
                        items: updatedItems
                    });
                } else {
                    // If the item does not exist, add it to the cart with quantity 1
                    updatedItems = [
                        ...existingCart.items ?? [],
                        {
                            product: targetID,
                            quantity: 1
                        }
                    ];
                    // Update the cart with the new items
                    await updateCart(cartID, {
                        items: updatedItems
                    });
                }
                resolve();
            });
        });
    }, [
        cartID,
        cartSecret,
        getCart,
        startTransition,
        updateCart
    ]);
    const decrementItem = useCallback(async (targetID)=>{
        return new Promise((resolve)=>{
            startTransition(async ()=>{
                if (!cartID) {
                    resolve();
                    return;
                }
                const existingCart = await getCart(cartID, {
                    secret: cartSecret
                });
                if (!existingCart) {
                    // console.error(`Cart with ID "${cartID}" not found`)
                    setCartID(undefined);
                    setCart(undefined);
                    resolve();
                    return;
                }
                // Check if the item already exists in the cart
                const existingItemIndex = existingCart.items?.findIndex((cartItem)=>cartItem.id === targetID) ?? -1;
                const updatedItems = existingCart.items ? [
                    ...existingCart.items
                ] : [];
                if (existingItemIndex !== -1) {
                    // If the item exists, decrement its quantity
                    updatedItems[existingItemIndex].quantity = updatedItems[existingItemIndex].quantity - 1; // Decrement by 1
                    // If the quantity reaches 0, remove the item from the cart
                    if (updatedItems[existingItemIndex].quantity <= 0) {
                        updatedItems.splice(existingItemIndex, 1);
                    }
                    // Update the cart with the new items
                    await updateCart(cartID, {
                        items: updatedItems
                    });
                }
                resolve();
            });
        });
    }, [
        cartID,
        cartSecret,
        getCart,
        startTransition,
        updateCart
    ]);
    const clearCart = useCallback(async ()=>{
        return new Promise((resolve)=>{
            startTransition(async ()=>{
                if (cartID) {
                    await deleteCart(cartID);
                }
                resolve();
            });
        });
    }, [
        cartID,
        deleteCart,
        startTransition
    ]);
    const setCurrency = useCallback((currency)=>{
        if (selectedCurrency.code === currency) {
            return;
        }
        const foundCurrency = currenciesConfig.supportedCurrencies.find((c)=>c.code === currency);
        if (!foundCurrency) {
            throw new Error(`Currency with code "${currency}" not found in config`);
        }
        setSelectedCurrency(foundCurrency);
    }, [
        currenciesConfig.supportedCurrencies,
        selectedCurrency.code
    ]);
    const initiatePayment = useCallback(async (paymentMethodID, options)=>{
        const paymentMethod = paymentMethods.find((method)=>method.name === paymentMethodID);
        if (!paymentMethod) {
            throw new Error(`Payment method with ID "${paymentMethodID}" not found`);
        }
        if (!cartID) {
            throw new Error(`No cart is provided.`);
        }
        setSelectedPaymentMethod(paymentMethodID);
        if (paymentMethod.initiatePayment) {
            const fetchURL = `${baseAPIURL}/payments/${paymentMethodID}/initiate`;
            const data = {
                cartID,
                currency: selectedCurrency.code
            };
            try {
                const response = await fetch(fetchURL, {
                    body: JSON.stringify({
                        ...data,
                        ...options?.additionalData || {}
                    }),
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: 'POST'
                });
                if (!response.ok) {
                    const responseError = await response.text();
                    throw new Error(responseError);
                }
                const responseData = await response.json();
                if (responseData.error) {
                    throw new Error(responseData.error);
                }
                return responseData;
            } catch (error) {
                if (debug) {
                    // eslint-disable-next-line no-console
                    console.error('Error initiating payment:', error);
                }
                throw new Error(error instanceof Error ? error.message : 'Failed to initiate payment');
            }
        } else {
            throw new Error(`Payment method "${paymentMethodID}" does not support payment initiation`);
        }
    }, [
        baseAPIURL,
        cartID,
        debug,
        paymentMethods,
        selectedCurrency.code
    ]);
    const confirmOrder = useCallback(async (paymentMethodID, options)=>{
        if (!cartID) {
            throw new Error(`Cart is empty.`);
        }
        const paymentMethod = paymentMethods.find((pm)=>pm.name === paymentMethodID);
        if (!paymentMethod) {
            throw new Error(`Payment method with ID "${paymentMethodID}" not found`);
        }
        if (paymentMethod.confirmOrder) {
            const fetchURL = `${baseAPIURL}/payments/${paymentMethodID}/confirm-order`;
            const data = {
                cartID,
                currency: selectedCurrency.code
            };
            const response = await fetch(fetchURL, {
                body: JSON.stringify({
                    ...data,
                    ...options?.additionalData || {}
                }),
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            });
            if (!response.ok) {
                const responseError = await response.text();
                throw new Error(responseError);
            }
            const responseData = await response.json();
            if (responseData.error) {
                throw new Error(responseData.error);
            }
            return responseData;
        } else {
            throw new Error(`Payment method "${paymentMethodID}" does not support order confirmation`);
        }
    }, [
        baseAPIURL,
        cartID,
        paymentMethods,
        selectedCurrency.code
    ]);
    const getUser = useCallback(async ()=>{
        try {
            const query = qs.stringify({
                depth: 0,
                select: {
                    id: true,
                    carts: true
                }
            });
            const response = await fetch(`${baseAPIURL}/${customersSlug}/me?${query}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'GET'
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch user: ${errorText}`);
            }
            const userData = await response.json();
            if (userData.error) {
                throw new Error(`User fetch error: ${userData.error}`);
            }
            if (userData.user) {
                setUser(userData.user);
                return userData.user;
            }
        } catch (error) {
            if (debug) {
                // eslint-disable-next-line no-console
                console.error('Error fetching user:', error);
            }
            setUser(null);
            throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [
        baseAPIURL,
        customersSlug,
        debug
    ]);
    const refreshUser = useCallback(async ()=>{
        try {
            const fetchedUser = await getUser();
            if (fetchedUser && fetchedUser.cart?.docs && fetchedUser.cart.docs.length > 0) {
                const userCartID = typeof fetchedUser.cart.docs[0] === 'object' ? fetchedUser.cart.docs[0].id : fetchedUser.cart.docs[0];
                if (userCartID) {
                    const fetchedCart = await getCart(userCartID);
                    setCart(fetchedCart);
                    setCartID(userCartID);
                }
            }
        } catch (error) {
            // User is not logged in, clear cart state for authenticated user
            setUser(null);
        // Don't clear cart - keep localStorage cart for guest
        }
    }, [
        getCart,
        getUser
    ]);
    const getAddresses = useCallback(async ()=>{
        if (!user) {
            return;
        }
        try {
            const query = qs.stringify({
                depth: 0,
                limit: 0,
                pagination: false
            });
            const response = await fetch(`${baseAPIURL}/${addressesSlug}?${query}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'GET'
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`Address fetch error: ${data.error}`);
            }
            setAddresses(data.docs ?? []);
        } catch (error) {
            if (debug) {
                // eslint-disable-next-line no-console
                console.error('Error fetching addresses:', error);
            }
            setAddresses([]);
        // Don't rethrow - allow the operation to complete even if refresh fails
        }
    }, [
        user,
        baseAPIURL,
        addressesSlug,
        debug
    ]);
    const updateAddress = useCallback(async (addressID, address)=>{
        if (!user) {
            throw new Error('User must be logged in to update or create an address');
        }
        try {
            const response = await fetch(`${baseAPIURL}/${addressesSlug}/${addressID}`, {
                body: JSON.stringify(address),
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'PATCH'
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update or create address: ${errorText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`Address update/create error: ${data.error}`);
            }
            // Refresh addresses after updating or creating
            await getAddresses();
        } catch (error) {
            if (debug) {
                // eslint-disable-next-line no-console
                console.error('Error updating or creating address:', error);
            }
            throw new Error(`Failed to update or create address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [
        user,
        baseAPIURL,
        addressesSlug,
        getAddresses,
        debug
    ]);
    const createAddress = useCallback(async (address)=>{
        if (!user) {
            throw new Error('User must be logged in to update or create an address');
        }
        try {
            const response = await fetch(`${baseAPIURL}/${addressesSlug}`, {
                body: JSON.stringify(address),
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update or create address: ${errorText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`Address update/create error: ${data.error}`);
            }
            // Refresh addresses after updating or creating
            await getAddresses();
        } catch (error) {
            if (debug) {
                // eslint-disable-next-line no-console
                console.error('Error updating or creating address:', error);
            }
            throw new Error(`Failed to update or create address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [
        user,
        baseAPIURL,
        addressesSlug,
        getAddresses,
        debug
    ]);
    const deleteAddress = useCallback(async (addressID)=>{
        if (!user) {
            throw new Error('User must be logged in to delete an address');
        }
        try {
            const response = await fetch(`${baseAPIURL}/${addressesSlug}/${addressID}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete address: ${errorText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`Address delete error: ${data.error}`);
            }
            // Refresh addresses after deleting
            await getAddresses();
        } catch (error) {
            if (debug) {
                // eslint-disable-next-line no-console
                console.error('Error deleting address:', error);
            }
            throw new Error(`Failed to delete address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [
        user,
        baseAPIURL,
        addressesSlug,
        getAddresses,
        debug
    ]);
    // If localStorage is enabled, restore cart from storage
    useEffect(()=>{
        if (!hasRendered.current) {
            if (syncLocalStorage) {
                const storedCartID = localStorage.getItem(localStorageConfig.key);
                const storedSecret = localStorage.getItem(`${localStorageConfig.key}_secret`);
                if (storedCartID) {
                    getCart(storedCartID, {
                        secret: storedSecret || undefined
                    }).then((fetchedCart)=>{
                        setCart(fetchedCart);
                        setCartID(storedCartID);
                        if (storedSecret) {
                            setCartSecret(storedSecret);
                        }
                    }).catch((_)=>{
                        // console.error('Error fetching cart from localStorage:', error)
                        // If there's an error fetching the cart, clear it from localStorage
                        localStorage.removeItem(localStorageConfig.key);
                        localStorage.removeItem(`${localStorageConfig.key}_secret`);
                        setCartID(undefined);
                        setCart(undefined);
                        setCartSecret(undefined);
                    });
                }
            }
            hasRendered.current = true;
            // Helper function to load user's cart
            const loadUserCart = (userData)=>{
                if (userData.cart?.docs && userData.cart.docs.length > 0) {
                    const userCartID = typeof userData.cart.docs[0] === 'object' ? userData.cart.docs[0].id : userData.cart.docs[0];
                    if (userCartID) {
                        getCart(userCartID).then((fetchedCart)=>{
                            setCart(fetchedCart);
                            setCartID(userCartID);
                        }).catch((error)=>{
                            if (debug) {
                                // eslint-disable-next-line no-console
                                console.error('Error fetching user cart:', error);
                            }
                            setCart(undefined);
                            setCartID(undefined);
                            throw new Error(`Failed to fetch user cart: ${error.message}`);
                        });
                    }
                }
            };
            // Fetch user from API
            void getUser().then((fetchedUser)=>{
                if (fetchedUser) {
                    loadUserCart(fetchedUser);
                }
            });
        }
    }, [
        debug,
        getAddresses,
        getCart,
        getUser,
        localStorageConfig.key,
        syncLocalStorage
    ]);
    useEffect(()=>{
        if (user) {
            // If the user is logged in, fetch their addresses
            void getAddresses();
        } else {
            // If no user is logged in, clear addresses
            setAddresses(undefined);
        }
    }, [
        getAddresses,
        user
    ]);
    return /*#__PURE__*/ _jsx(EcommerceContext, {
        value: {
            addItem,
            addresses,
            cart,
            clearCart,
            confirmOrder,
            createAddress,
            deleteAddress,
            currenciesConfig,
            currency: selectedCurrency,
            decrementItem,
            incrementItem,
            initiatePayment,
            isLoading,
            paymentMethods,
            refreshUser,
            removeItem,
            selectedPaymentMethod,
            setCurrency,
            updateAddress
        },
        children: children
    });
};
export const useEcommerce = ()=>{
    const context = use(EcommerceContext);
    if (!context) {
        throw new Error('useEcommerce must be used within an EcommerceProvider');
    }
    return context;
};
export const useCurrency = ()=>{
    const { currenciesConfig, currency, setCurrency } = useEcommerce();
    const formatCurrency = useCallback((value, options)=>{
        if (value === undefined || value === null) {
            return '';
        }
        const currencyToUse = options?.currency || currency;
        if (!currencyToUse) {
            return value.toString();
        }
        if (value === 0) {
            return `${currencyToUse.symbol}0.${'0'.repeat(currencyToUse.decimals)}`;
        }
        // Convert from base value (e.g., cents) to decimal value (e.g., dollars)
        const decimalValue = value / Math.pow(10, currencyToUse.decimals);
        // Format with the correct number of decimal places
        return `${currencyToUse.symbol}${decimalValue.toFixed(currencyToUse.decimals)}`;
    }, [
        currency
    ]);
    if (!currency) {
        throw new Error('useCurrency must be used within an EcommerceProvider');
    }
    return {
        currency,
        formatCurrency,
        setCurrency,
        supportedCurrencies: currenciesConfig.supportedCurrencies
    };
};
export function useCart() {
    const { addItem, cart, clearCart, decrementItem, incrementItem, isLoading, removeItem } = useEcommerce();
    if (!addItem) {
        throw new Error('useCart must be used within an EcommerceProvider');
    }
    return {
        addItem,
        cart: cart,
        clearCart,
        decrementItem,
        incrementItem,
        isLoading,
        removeItem
    };
}
export const usePayments = ()=>{
    const { confirmOrder, initiatePayment, isLoading, paymentMethods, selectedPaymentMethod } = useEcommerce();
    if (!initiatePayment) {
        throw new Error('usePayments must be used within an EcommerceProvider');
    }
    return {
        confirmOrder,
        initiatePayment,
        isLoading,
        paymentMethods,
        selectedPaymentMethod
    };
};
export function useAddresses() {
    const { addresses, createAddress, deleteAddress, isLoading, updateAddress } = useEcommerce();
    if (!createAddress) {
        throw new Error('useAddresses must be used within an EcommerceProvider');
    }
    return {
        addresses: addresses,
        createAddress,
        deleteAddress,
        isLoading,
        updateAddress
    };
}

//# sourceMappingURL=index.js.map