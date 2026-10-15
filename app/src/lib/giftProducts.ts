/** 추석 선물세트 상품 목록 — 공개 신청 페이지와 관리자 조회에서 공용. */
export interface GiftProduct {
  name: string;
  price: number;
}

export const GIFT_PRODUCTS: GiftProduct[] = [
  { name: "스마트 선물set 1호", price: 66000 },
  { name: "스마트 선물set 2호", price: 66000 },
  { name: "스마트 선물set 3호", price: 66000 },
  { name: "스마트 선물set 4호", price: 60500 },
  { name: "스마트 선물set 5호", price: 60500 },
  { name: "스마트 선물set 6호", price: 66000 },
  { name: "스마트 선물set 7호", price: 55000 },
  { name: "스마트 선물set 8호", price: 55000 },
  { name: "설렘 선물set 1호", price: 29890 },
  { name: "설렘 선물set 2호", price: 29890 },
  { name: "실속형 사과", price: 23000 },
  { name: "실속형 배", price: 22000 },
  { name: "배 선물set", price: 88000 },
  { name: "사과 선물set", price: 121000 },
  { name: "사과배 혼합set", price: 104500 },
];

export const priceOf = (name: string) =>
  GIFT_PRODUCTS.find((p) => p.name === name)?.price ?? 0;

export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
