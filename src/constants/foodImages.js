// 備註: 食物圖片來源使用可直接貼圖的公開網址；可自行增減
export const foodImages = [
  'https://loremflickr.com/800/600/food?lock=11',
  'https://loremflickr.com/800/600/food?lock=12',
  'https://loremflickr.com/800/600/food?lock=13',
  'https://loremflickr.com/800/600/food?lock=14',
  'https://loremflickr.com/800/600/food?lock=15',
  'https://loremflickr.com/800/600/food?lock=16',
  'https://loremflickr.com/800/600/food?lock=17',
  'https://loremflickr.com/800/600/food?lock=18',
  'https://loremflickr.com/800/600/food?lock=19',
  'https://loremflickr.com/800/600/food?lock=20',
]

export const getRandomFoodImage = () => {
  const idx = Math.floor(Math.random() * foodImages.length)
  return foodImages[idx]
}
