import firstHalf from "./review-cards-a.json";
import secondHalf from "./review-cards-b.json";
import type { ReviewCard } from "../lib/review";

export const reviewCards: ReviewCard[] = [...firstHalf, ...secondHalf];
