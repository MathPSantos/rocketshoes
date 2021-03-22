import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";
import { STORAGE_KEY } from "../constants";

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
    const storagedCart = localStorage.getItem(`${STORAGE_KEY}:cart`);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}:cart`, JSON.stringify(cart));
  }, [cart]);

  const getProductStock = async (productId: number) => {
    const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

    return productStock.amount;
  };

  const addProduct = async (productId: number) => {
    try {
      const productStock = await getProductStock(productId);

      if (productStock <= 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      let product = cart.find((product) => product.id === productId);
      let newCart = [];

      if (!product) {
        const response = await api.get<Omit<Product, "amount">>(
          `/products/${productId}`
        );

        product = {
          ...response.data,
          amount: 1,
        };

        newCart = [...cart, product];
        setCart(newCart);
      } else {
        newCart = cart.map((product) =>
          product.id !== productId
            ? product
            : {
                ...product,
                amount: product.amount + 1,
              }
        );
        setCart(newCart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const newCart = cart.filter((product) => product.id !== productId);

      setCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock = await getProductStock(productId);

      if (amount > 0 && productStock <= 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((product) =>
        product.id !== productId
          ? product
          : {
              ...product,
              amount: product.amount + amount,
            }
      );
      setCart(newCart);
    } catch {
      toast.error("Erro na alteração da quantidade do produto");
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
