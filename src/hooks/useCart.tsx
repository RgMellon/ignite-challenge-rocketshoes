import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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

const KEY = "@RocketShoes:cart";

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(KEY);

    if (!!storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const saveCart = (items: Product[]) => {
    localStorage.setItem(KEY, JSON.stringify(items));
  };

  const verifyIfExistsItemOnStock = async (
    productId: number
  ): Promise<boolean> => {
    const response = await api.get<Stock>(`stock/${productId}`);
    const { data: stock } = response;

    return stock.amount >= 0;
  };

  const addProduct = async (productId: number) => {
    try {
      const emptyStock = await verifyIfExistsItemOnStock(productId);

      if (emptyStock) {
        toast.error("Quantidade solicitada fora de estoque");
      }

      const response = await api.get(`products/${productId}`);
      const { data: responseProduct } = response;

      const productExistsOnCart = cart.find(
        (product) => product.id === responseProduct.id
      );

      if (!productExistsOnCart) {
        const product = {
          ...responseProduct,
          amount: 1,
        };

        const productWithNewItems = [...cart, product];
        setCart(productWithNewItems);
        saveCart(productWithNewItems);
        return;
      }

      const updatAmountProduct = cart.map((product) => {
        if (product.id === productExistsOnCart.id) {
          return {
            ...product,
            amount: product.amount + 1,
          };
        }

        return product;
      });

      setCart(updatAmountProduct);
      saveCart(updatAmountProduct);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProductOnCart = cart.find(
        (product) => product.id === productId
      );

      if (!findProductOnCart) {
        throw new Error();
      }

      const products = cart.filter((product) => product.id !== productId);

      setCart(products);
      saveCart(products);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return;

    try {
      const response = await api.get<Stock>(`stock/${productId}`);
      const { data: stock } = response;

      if (stock.amount <= 0) {
        throw new Error();
      }

      if (amount >= stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const mappedCart = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          };
        }

        return product;
      });

      setCart(mappedCart);
      saveCart(mappedCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
