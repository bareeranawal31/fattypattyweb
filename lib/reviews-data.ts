export interface CustomerReview {
  id: string
  name: string
  rating: number
  review: string
  initial: string
  isVisible: boolean
  createdAt: string
}

export const DEFAULT_REVIEWS: CustomerReview[] = [
  {
    id: 'default-1',
    name: 'Ahmed Khan',
    rating: 5,
    review: 'The Classic Wagyu is hands down the best burger in Karachi. Perfectly cooked, amazing flavor. Worth every rupee!',
    initial: 'AK',
    isVisible: true,
    createdAt: new Date('2025-01-05').toISOString(),
  },
  {
    id: 'default-2',
    name: 'Sara Malik',
    rating: 5,
    review: 'Fatty Patty never disappoints. Their Chicken Jalapeno is my go-to. The spice level is perfect!',
    initial: 'SM',
    isVisible: true,
    createdAt: new Date('2025-01-11').toISOString(),
  },
  {
    id: 'default-3',
    name: 'Faisal Raza',
    rating: 5,
    review: 'Best smashed burgers in town. The Beef Signature with extra cheese is absolutely incredible.',
    initial: 'FR',
    isVisible: true,
    createdAt: new Date('2025-01-14').toISOString(),
  },
  {
    id: 'default-4',
    name: 'Hira Sheikh',
    rating: 4,
    review: 'Love the Moroccan Bowl! So flavorful and filling. Great option when you want something different from burgers.',
    initial: 'HS',
    isVisible: true,
    createdAt: new Date('2025-01-18').toISOString(),
  },
  {
    id: 'default-5',
    name: 'Usman Ali',
    rating: 5,
    review: 'The Fatty Fries are loaded to perfection. Great delivery too - everything arrived hot and fresh.',
    initial: 'UA',
    isVisible: true,
    createdAt: new Date('2025-01-21').toISOString(),
  },
  {
    id: 'default-6',
    name: 'Zara Noor',
    rating: 5,
    review: 'Ordered the All American and it was amazing! The double patty with special sauce is addictive.',
    initial: 'ZN',
    isVisible: true,
    createdAt: new Date('2025-01-25').toISOString(),
  },
]
