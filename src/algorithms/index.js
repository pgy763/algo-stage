import bubble from './bubble.js'
import quick from './quick.js'
import merge from './merge.js'
import binarySearch from './binarySearch.js'
import slidingWindow from './slidingWindow.js'
import monotonicStack from './monotonicStack.js'
import bst from './bst.js'
import kmp from './kmp.js'
import bfs from './bfs.js'
import dijkstra from './dijkstra.js'
import treeTraversal from './treeTraversal.js'
import nqueens from './nqueens.js'
import lcs from './lcs.js'

/** 新算法只要在这里注册一下就能出现在首页 */
export const algorithms = [
  bubble,
  quick,
  merge,
  binarySearch,
  slidingWindow,
  monotonicStack,
  bst,
  kmp,
  bfs,
  dijkstra,
  treeTraversal,
  nqueens,
  lcs
]

export function byId(id) {
  return algorithms.find((a) => a.id === id) || null
}

export const categories = ['全部', ...new Set(algorithms.map((a) => a.category))]
