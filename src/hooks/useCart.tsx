import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productExists = updatedCart.find(product => product.id === productId);

      const stock = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const updatedAmount = currentAmount + 1;

      if (updatedAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = updatedAmount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`);

        if (!product.data) {
          toast.error('Hm... parece que o produto solicitado não existe mais :(');
          return;
        }

        const newProduct = {
          ...product.data,
          amount: 1,
        }

        updatedCart.push(newProduct);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch (err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(cartItem => cartItem.id === productId);

      if (!productAlreadyInCart) {
        throw Error();
      }

      const updatedCart = [...cart];
      const productIndex = cart.findIndex(cartItem => cartItem.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch (err) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;


      if (amount > stockAmount || amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const product = cart.find(cartItem => cartItem.id === productId);

      if (!product) {
        toast.error('Este produto não se econtra no carrinho :/');
        return;
      }

      const updatedCart = [...cart];
      const updatedProduct = { ...product };

      const productIndex = updatedCart.findIndex(cartItem => cartItem.id === updatedProduct.id);

      if (productIndex >= 0) {
        updatedProduct.amount = amount;

        updatedCart.splice(productIndex, 1, updatedProduct);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
