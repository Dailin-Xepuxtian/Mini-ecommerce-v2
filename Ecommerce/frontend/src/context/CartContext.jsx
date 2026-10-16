import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem('carrito') || '[]'));

  useEffect(() => localStorage.setItem('carrito', JSON.stringify(items)), [items]);

  const add = (producto, cantidad = 1) =>
    setItems((prev) => {
      const ex = prev.find((i) => i.producto.id_producto === producto.id_producto);
      const max = producto.stock;
      if (ex) {
        return prev.map((i) =>
          i.producto.id_producto === producto.id_producto
            ? { ...i, cantidad: Math.min(i.cantidad + cantidad, max) }
            : i
        );
      }
      return [...prev, { producto, cantidad: Math.min(cantidad, max) }];
    });

  const setCantidad = (id, cantidad) =>
    setItems((prev) =>
      prev.map((i) =>
        i.producto.id_producto === id
          ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.producto.stock)) }
          : i
      )
    );

  const remove = (id) => setItems((prev) => prev.filter((i) => i.producto.id_producto !== id));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.cantidad, 0);
  const total = items.reduce((s, i) => s + i.cantidad * Number(i.producto.precio_venta), 0);

  return (
    <CartContext.Provider value={{ items, add, setCantidad, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}