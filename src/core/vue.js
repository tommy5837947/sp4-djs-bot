import { createApp } from "vue"
import { createPinia } from "pinia"

export default() => {
    const vue = createApp({})
    console.log('已創建vue')
    const pinia = createPinia()
    console.log('已創建Pinia')

    vue.use(pinia)
    console.log('vue環境建置成功,使用Pinia！')
    //用於建置store
}