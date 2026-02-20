import { defineStore } from "pinia"

export const useAppStore = defineStore('app', {
    state: () => ({
        // 備註: 原本是 clinet typo，統一改為 client
        client: null,
        commandsActionMap: null,
        commandMetaMap: null,
        // 備註: 紀錄事件綁定函式引用，供 reload 時正確解除舊監聽
        eventHandlerMap: null,
    }),
    getters: {},
    actions: {},
  })
