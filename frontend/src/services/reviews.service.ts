import { api, ensureFreshAccessToken } from "./api";

type ApiResponse<T> = { success: boolean; data: T };

export type VisitorReviewImage = {
  id: string;
  imageUrl: string;
  position: number;
};

export type VisitorReviewLocation = {
  id: string;
  label: string;
};

export type VisitorReview = {
  id: string;
  experienceId: string;
  location: VisitorReviewLocation | null;
  rating: number;
  score: number;
  organizationRating: number | null;
  valueRating: number | null;
  recommended: boolean | null;
  comment: string;
  images: VisitorReviewImage[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

export type VisitorReviewPhotos = {
  keepImageIds: string[];
  files: File[];
};

export type VisitorReviewSummary = {
  averageRating: number | null;
  count: number;
};

export type VisitorReviewList = {
  summary: VisitorReviewSummary;
  reviews: VisitorReview[];
  mine: VisitorReview[];
};

export type VisitorReviewInput = {
  rating: number;
  organizationRating: number;
  valueRating: number;
  recommended: boolean;
  comment: string;
  locationId?: string;
};

export function listExperienceReviews(experienceId: string) {
  return api
    .get<ApiResponse<VisitorReviewList>>(`/experiences/${experienceId}/reviews`)
    .then((response) => response.data.data);
}

export type MyVisitorReview = VisitorReview & {
  experience: {
    id: string;
    title: string;
    locations: Array<{ id: string; label: string }>;
  };
};

export function listMyReviews() {
  return api
    .get<ApiResponse<{ reviews: MyVisitorReview[] }>>("/experiences/reviews/mine")
    .then((response) => response.data.data);
}

function reviewForm(input: VisitorReviewInput, photos: VisitorReviewPhotos) {
  const form = new FormData();
  form.append("rating", String(input.rating));
  form.append("organizationRating", String(input.organizationRating));
  form.append("valueRating", String(input.valueRating));
  form.append("recommended", String(input.recommended));
  form.append("comment", input.comment);
  if (input.locationId) {
    form.append("locationId", input.locationId);
  }
  form.append("keepImageIds", JSON.stringify(photos.keepImageIds));
  photos.files.forEach((file) => form.append("images", file));
  return form;
}

export function createExperienceReview(experienceId: string, input: VisitorReviewInput, photos: VisitorReviewPhotos) {
  return api
    .post<ApiResponse<{ review: VisitorReview; summary: VisitorReviewSummary }>>(
      `/experiences/${experienceId}/reviews`,
      reviewForm(input, photos),
    )
    .then((response) => response.data.data);
}

export function updateExperienceReview(
  experienceId: string,
  reviewId: string,
  input: VisitorReviewInput,
  photos: VisitorReviewPhotos,
) {
  return api
    .patch<ApiResponse<{ review: VisitorReview; summary: VisitorReviewSummary }>>(
      `/experiences/${experienceId}/reviews/${reviewId}`,
      reviewForm(input, photos),
    )
    .then((response) => response.data.data);
}

export async function deleteExperienceReview(experienceId: string, reviewId: string) {
  await ensureFreshAccessToken();
  const response = await api.delete<ApiResponse<{ summary: VisitorReviewSummary }>>(
    `/experiences/${experienceId}/reviews/${reviewId}`,
  );
  return response.data.data;
}
