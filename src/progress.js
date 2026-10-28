// 学习进度：播放到最后一帧即记「已学」。存 localStorage。

const KEY = 'algo-watched'

export function loadWatched() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export function markWatched(algoId) {
  const set = loadWatched()
  set.add(algoId)
  localStorage.setItem(KEY, JSON.stringify([...set]))
  return set
}
