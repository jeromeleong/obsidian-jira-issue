import { MarkdownPostProcessorContext } from "obsidian"
import { IJiraSearchResults } from "../interfaces/issueInterfaces"
import JiraClient from "../client/jiraClient"
import ObjectsCache from "../objectsCache"
import RC from "./renderingCommon"
import { SearchView } from "../searchView"
import { SettingsData } from "../settings"

function renderSearchCount(el: HTMLElement, searchResults: IJiraSearchResults, searchView: SearchView): void {
    const tagsRow = createDiv('ji-tags has-addons')
    RC.renderAccountColorBand(searchResults.account, tagsRow)
    if (searchView.label !== '') {
        createSpan({ cls: `ji-tag is-link ${RC.getTheme()}`, text: searchView.label || `Count`, title: searchView.query, parent: tagsRow })
    }
    const total = searchResults.total ?? searchResults.issues?.length ?? 0
    createSpan({ cls: `ji-tag ${RC.getTheme()}`, text: total.toString(), title: searchView.query, parent: tagsRow })
    el.replaceChildren(RC.renderContainer([tagsRow]))
}

export const CountFenceRenderer = async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
    // console.log(`Search query: ${source}`)
    const searchView = SearchView.fromString(source)
    const cachedSearchResults = ObjectsCache.get(searchView.getCacheKey())
    if (cachedSearchResults) {
        if (cachedSearchResults.isError) {
            RC.renderSearchError(el, cachedSearchResults.data as string, searchView)
        } else {
            renderSearchCount(el, (cachedSearchResults.data as IJiraSearchResults), searchView)
        }
    } else {
        RC.renderLoadingItem('Loading...')
        JiraClient.getSearchResultsCount(searchView.query, { account: searchView.account }).then(count => {
            // 創建一個模擬的 searchResults 對象來兼容現有的渲染邏輯
            const mockSearchResults: IJiraSearchResults = {
                issues: [],
                total: count,
                account: searchView.account || SettingsData.accounts[0]
            }
            const searchResults = ObjectsCache.add(searchView.getCacheKey(), mockSearchResults).data as IJiraSearchResults
            renderSearchCount(el, searchResults, searchView)
        }).catch(err => {
            ObjectsCache.add(searchView.getCacheKey(), err, true)
            RC.renderSearchError(el, err, searchView)
        })
    }
}
