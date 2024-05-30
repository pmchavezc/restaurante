import { LatLng } from 'leaflet';

export interface CartItemInterface {
  FoodId: string;
  Quantity: number;
  Price: number;
}
export interface OrderInterface {
  Items: CartItemInterface[];
  TotalPrice: number;
  Name: string;
  Address: string;
  AddressLatLng: LatLng;
  userId: string;
}
