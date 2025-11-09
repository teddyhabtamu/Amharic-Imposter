import { useMemo, useState } from 'react'

import { pickRandomWord, WORDS } from './data/words'

type Stage = 'setup' | 'reveal' | 'voting' | 'result'

type PlayerAssignment = {
  id: number
  name: string
  isImposter: boolean
  word: string | null
}

const MIN_PLAYERS = 3
const MAX_PLAYERS = 12
const MIN_IMPOSTERS = 1

const getMaxImposters = (count: number) =>
  Math.max(MIN_IMPOSTERS, Math.max(0, count - 1))

const createDefaultName = (index: number) => `ተጫዋች ${index + 1}`

const ensureNameList = (count: number, current: string[]) => {
  const trimmed = current.slice(0, count)
  if (trimmed.length === count) return trimmed

  const next = [...trimmed]
  for (let i = trimmed.length; i < count; i += 1) {
    next.push(createDefaultName(i))
  }
  return next
}

const getVoteSummary = (votes: number[], players: PlayerAssignment[]) => {
  return players.map((player, targetIndex) => ({
    player,
    votes: votes.filter((vote) => vote === targetIndex).length,
  }))
}

function App() {
  const [stage, setStage] = useState<Stage>('setup')
  const [playerCount, setPlayerCount] = useState(5)
  const [playerNames, setPlayerNames] = useState<string[]>(
    ensureNameList(5, []),
  )
  const [imposterCount, setImposterCount] = useState(MIN_IMPOSTERS)
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([])
  const [selectedWord, setSelectedWord] = useState<string>('')
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0)
  const [wordRevealed, setWordRevealed] = useState(false)
  const [votes, setVotes] = useState<number[]>([])
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0)
  const [error, setError] = useState('')

  const voteSummary = useMemo(
    () => getVoteSummary(votes, assignments),
    [votes, assignments],
  )

  const imposters = useMemo(
    () => assignments.filter((player) => player.isImposter),
    [assignments],
  )

  const adjustPlayerCount = (count: number) => {
    const safeCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, count))
    setPlayerCount(safeCount)
    setPlayerNames((prev) => ensureNameList(safeCount, prev))
    setImposterCount((prev) =>
      Math.min(prev, getMaxImposters(safeCount)),
    )
  }

  const adjustImposterCount = (count: number) => {
    const maxImposters = getMaxImposters(playerCount)
    const safeCount = Math.max(
      MIN_IMPOSTERS,
      Math.min(maxImposters, count),
    )
    setImposterCount(safeCount)
  }

  const handleStartGame = () => {
    setError('')
    const sanitizedNames = ensureNameList(
      playerCount,
      playerNames.map((name, index) =>
        name.trim().length > 0 ? name.trim() : createDefaultName(index),
      ),
    )

    if (sanitizedNames.length < MIN_PLAYERS) {
      setError(`ቢያንስ ${MIN_PLAYERS} ተጫዋቾች ያስፈልጋሉ።`)
      return
    }

    const maxImposters = getMaxImposters(sanitizedNames.length)
    if (imposterCount > maxImposters) {
      setError(
        `ኢምፖስተሮች ቁጥር ከተጫዋቾች ቁጥር አንዱ በታች መሆን አለበት።`,
      )
      return
    }

    setPlayerNames(sanitizedNames)

    const imposterIndices = new Set<number>()
    while (imposterIndices.size < imposterCount) {
      const randomIndex = Math.floor(Math.random() * sanitizedNames.length)
      imposterIndices.add(randomIndex)
    }
    const word = pickRandomWord()

    const nextAssignments = sanitizedNames.map((name, index) => ({
      id: index,
      name,
      isImposter: imposterIndices.has(index),
      word: imposterIndices.has(index) ? null : word,
    }))

    setAssignments(nextAssignments)
    setSelectedWord(word)
    setVotes(Array(sanitizedNames.length).fill(-1))
    setCurrentVoterIndex(0)
    setCurrentRevealIndex(0)
    setWordRevealed(false)
    setStage('reveal')
  }

  const handleReset = () => {
    setStage('setup')
    setAssignments([])
    setSelectedWord('')
    setCurrentRevealIndex(0)
    setWordRevealed(false)
    setVotes([])
    setCurrentVoterIndex(0)
    setError('')
  }

  const handleRevealWord = () => {
    setWordRevealed(true)
  }

  const handleNextPlayer = () => {
    const isLastPlayer = currentRevealIndex === assignments.length - 1
    setWordRevealed(false)

    if (isLastPlayer) {
      setStage('voting')
      setCurrentVoterIndex(0)
    } else {
      setCurrentRevealIndex((prev) => prev + 1)
    }
  }

  const handleSelectVote = (targetIndex: number) => {
    setError('')
    setVotes((prev) => {
      const next = [...prev]
      next[currentVoterIndex] = targetIndex
      return next
    })
  }

  const handleConfirmVote = () => {
    if (votes[currentVoterIndex] === -1) {
      setError('እባክዎ ማንን ኢምፖስተር መሆኑን እንደሚጠሩ ይምረጡ።')
      return
    }

    const isLastVoter = currentVoterIndex === assignments.length - 1
    if (isLastVoter) {
      setStage('result')
    } else {
      setCurrentVoterIndex((prev) => prev + 1)
    }
  }

  const handlePlayAgain = () => handleReset()

  const remainingWords = WORDS.length

  const handleNameChange = (index: number, value: string) => {
    setPlayerNames((prev) => {
      const next = ensureNameList(playerCount, prev)
      const updated = [...next]
      updated[index] = value
      return updated
    })
  }

  const renderSetup = () => (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_-35px_rgba(16,185,129,0.7)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                ጨዋታን ይዘጋጁ
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                ተጫዋቾችን ይጨምሩ፣ ኢምፖስተሮችን ይመርጡ፣ ዝግጁ ሲሆኑ{' '}
                <span className="text-emerald-300">“ጨዋታ ጀምር”</span>{' '}
                ቁልፉን ይጫኑ።
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              <p className="font-semibold">⚡ ቁልፍ መመሪያ</p>
              <p className="text-xs text-emerald-200/80">
                ቢያንስ 3 ተጫዋች እና 1 ኢምፖስተር ያስፈልጋል። ኢምፖስተሮች ቁጥር ከተጫዋቾች
                አንዱ በታች መቆየት አለበት።
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_70px_-40px_rgba(14,165,233,0.65)] backdrop-blur">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  ተጫዋቾች
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[0.7rem] font-semibold text-emerald-200">
                  {MIN_PLAYERS}-{MAX_PLAYERS}
                </span>
              </div>
              <p className="mt-3 text-4xl font-bold text-emerald-300">
                {playerCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                በአጥቢያ ይጨምሩ ወይም ያቀናሹ።
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustPlayerCount(playerCount - 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={playerCount <= MIN_PLAYERS}
                >
                  −
                </button>
                <input
                  type="number"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  value={playerCount}
                  onChange={(event) => {
                    const inputValue = Number(event.target.value)
                    if (Number.isNaN(inputValue)) return
                    adjustPlayerCount(inputValue)
                  }}
                  className="w-20 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-center text-lg font-semibold text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
                <button
                  type="button"
                  onClick={() => adjustPlayerCount(playerCount + 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/60 bg-emerald-400/80 text-lg font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={playerCount >= MAX_PLAYERS}
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  ኢምፖስተሮች
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[0.7rem] font-semibold text-emerald-200">
                  {MIN_IMPOSTERS}-{getMaxImposters(playerCount)}
                </span>
              </div>
              <p className="mt-3 text-4xl font-bold text-teal-300">
                {imposterCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                ምርጫ በመጠን ይቀናሹ።
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustImposterCount(imposterCount - 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={imposterCount <= MIN_IMPOSTERS}
                >
                  −
                </button>
                <input
                  type="number"
                  min={MIN_IMPOSTERS}
                  max={getMaxImposters(playerCount)}
                  value={imposterCount}
                  onChange={(event) => {
                    const inputValue = Number(event.target.value)
                    if (Number.isNaN(inputValue)) return
                    adjustImposterCount(inputValue)
                  }}
                  className="w-20 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-center text-lg font-semibold text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
                <button
                  type="button"
                  onClick={() => adjustImposterCount(imposterCount + 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/60 bg-emerald-400/80 text-lg font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={imposterCount >= getMaxImposters(playerCount)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                ተጫዋቾች ስሞች
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-wide text-slate-400">
                የተዘጋጀ ስም ቢያጣ በራስ-ሰር ይቀየራል
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ensureNameList(playerCount, playerNames).map(
                (name, index) => (
                  <input
                    key={index}
                    value={name}
                    onChange={(event) =>
                      handleNameChange(index, event.target.value)
                    }
                    placeholder={createDefaultName(index)}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                ),
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartGame}
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 px-6 py-4 text-lg font-semibold text-slate-950 shadow-[0_20px_45px_-20px_rgba(6,182,212,0.9)] transition hover:from-emerald-400 hover:via-teal-300 hover:to-sky-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            🎮 ጨዋታ ጀምር
          </button>
        </div>
      </div>

      <aside className="grid gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_25px_70px_-40px_rgba(16,185,129,0.8)] backdrop-blur">
          <p className="text-sm font-semibold text-emerald-200">
            እንዴት ይጫወታሉ?
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
            <li className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-200">
                1
              </span>
              <p>
                የተጫዋቾች ስሞችን ያስገቡና ኢምፖስተሮች ቁጥርን ይምረጡ።
              </p>
            </li>
            <li className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-200">
                2
              </span>
              <p>
                ለእያንዳንዱ ተጫዋች ቃሉን ማሳያ ይንኩ። ኢምፖስተሮች ቃሉን አያውቁም።
              </p>
            </li>
            <li className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-200">
                3
              </span>
              <p>
                ውይይቱ ከተጠናቀቀ በኋላ ድምጽ ይሁን፣ ኢምፖስተሮቹን ያግኙ።
              </p>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 p-6 shadow-[0_18px_60px_-38px_rgba(6,182,212,0.8)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            ምክር
          </p>
          <p className="mt-3 text-sm text-slate-200">
            እያንዳንዱ ተጫዋች ቃሉን በብቻው ይመልከቱ፣ ኢምፖስተሮቹ ራሳቸውን እንዲሸፍኑ
            የሚያስፈልጋቸውን የማመን ብቃት ይጠቀሙ። ስለ ጨዋታው የተለያዩ ዘዴዎችን ይሞክሩ።
          </p>
        </div>
      </aside>
    </div>
  )

  const renderReveal = () => {
    const currentPlayer = assignments[currentRevealIndex]

    if (!currentPlayer) {
      return null
    }

    return (
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_20px_70px_-40px_rgba(45,212,191,0.8)] backdrop-blur">
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              ዙር {currentRevealIndex + 1} / {assignments.length}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {currentPlayer.name} ይዘጋጁ!
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              እባክዎን እያንዳንዱ ተጫዋች በብቻው እንዲመልከት ይያዙ። ቃሉን ካዩ በኋላ ወደ ቀጣይ ተጫዋች
              በመለካት ይቀጥሉ።
            </p>
          </div>

          <div className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/70 to-slate-900/40 p-10 shadow-inner shadow-emerald-500/10">
            {wordRevealed ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200/70">
                  የእርስዎ ቃል
                </p>
                <p className="text-5xl font-black text-emerald-300 sm:text-6xl">
                  {currentPlayer.word ?? '???'}
                </p>
                {currentPlayer.isImposter && (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 shadow-[0_18px_45px_-30px_rgba(244,63,94,0.8)]">
                    እርስዎ ኢምፖስተሩ ናቸው! እርግጠኛ እና ዝም ብለው ይጠብቁ።
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRevealWord}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/60 bg-emerald-500/15 px-8 py-4 text-lg font-semibold text-emerald-200 transition hover:bg-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                👀 ቃሉን አሳይ
              </button>
            )}
          </div>

          {wordRevealed && (
            <button
              type="button"
              onClick={handleNextPlayer}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300 px-6 py-3 text-lg font-semibold text-slate-950 shadow-[0_20px_45px_-25px_rgba(6,182,212,0.9)] transition hover:from-emerald-300 hover:via-teal-200 hover:to-sky-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              ሰውዬውን ቀጥል →
            </button>
          )}
        </section>

        <aside className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_22px_70px_-40px_rgba(59,130,246,0.55)] backdrop-blur">
          <div className="space-y-4 text-left md:text-right">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              የአሁን ተጫዋች
            </p>
            <p className="text-3xl font-bold text-white">{currentPlayer.name}</p>
            <p className="text-sm text-slate-300">
              በእሱ ብቻ ይቆዩ፣ የቃሉን ማሳያ ከገጹ ጋር ይቀላቀሉ። ለቀጣይ ተጫዋች በቀላሉ ይተላለፉ።
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-left md:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              የቀሩት
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {assignments.length - currentRevealIndex - 1}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              የቃል ማሳያ የሚቀሩ ተጫዋቾች።
            </p>
          </div>
        </aside>
      </div>
    )
  }

  const renderVoting = () => {
    const currentVoter = assignments[currentVoterIndex]

    if (!currentVoter) {
      return null
    }

    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_-45px_rgba(56,189,248,0.7)] backdrop-blur">
          <div className="space-y-3 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              የመለያየት ድምጽ {currentVoterIndex + 1} / {assignments.length}
            </div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              {currentVoter.name}፣ ኢምፖስተሮቹን ይጥቁ!
            </h2>
            <p className="text-sm text-slate-300">
              የተዘረዘሩትን እቅዶች ይመለከቱ። ማን ያለቀቀ? የእርስዎ ድምጽ ቁልፍ ነው።
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assignments.map((player, index) => {
              const isSelected = votes[currentVoterIndex] === index
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSelectVote(index)}
                  className={[
                    'group relative flex flex-col items-start gap-3 rounded-3xl border px-5 py-4 text-left shadow-[0_16px_45px_-35px_rgba(6,182,212,0.9)] transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60',
                    isSelected
                      ? 'border-emerald-400/80 bg-emerald-400/15'
                      : 'border-white/10 bg-slate-950/40 hover:border-emerald-400/40 hover:bg-slate-950/60',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-slate-300">
                    ተጫዋች #{player.id + 1}
                  </span>
                  <span className="text-xl font-semibold text-white">
                    {player.name}
                  </span>
                  <span
                    className={[
                      'absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition',
                      isSelected
                        ? 'border-emerald-400/70 bg-emerald-400/90 text-slate-950'
                        : 'border-white/10 bg-white/5 text-slate-300 group-hover:border-emerald-400/50 group-hover:text-emerald-200',
                    ].join(' ')}
                  >
                    {isSelected ? '✓' : '?'}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleConfirmVote}
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 px-6 py-4 text-lg font-semibold text-slate-950 shadow-[0_22px_55px_-30px_rgba(6,182,212,0.9)] transition hover:from-emerald-400 hover:via-teal-300 hover:to-sky-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            ✅ ድምጽ ያረጋግጡ
          </button>
        </section>

        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_-45px_rgba(139,92,246,0.6)] backdrop-blur">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              የእርስዎ ተግባር
            </p>
            <p className="text-2xl font-bold text-white">{currentVoter.name}</p>
            <p className="text-sm leading-relaxed text-slate-300">
              ተወላጅ ጥያቄዎችን ይጠይቁ፣ ተመሳሳይ መልሶችን ይተክቱ። እርስዎ የመጨረሻውን ውሳኔ ይሰጣሉ።
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              የቀሩ ድምጾች
            </p>
            <p className="mt-2 text-3xl font-bold text-teal-300">
              {assignments.length - currentVoterIndex - 1}
            </p>
            <p className="mt-1 text-xs text-slate-400">የሚቀጥሉ ተወላጅ ማረጋገጫዎች።</p>
          </div>
        </aside>
      </div>
    )
  }

  const renderResult = () => {
    if (imposters.length === 0) {
      return null
    }

    const isPlural = imposters.length > 1
    const imposterNames = imposters.map((player) => player.name).join(', ')

    const highestVote = voteSummary.reduce(
      (max, item) => Math.max(max, item.votes),
      0,
    )
    const mostVoted = voteSummary
      .filter((item) => item.votes === highestVote && highestVote > 0)
      .map((item) => item.player.name)
      .join(', ')

    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="space-y-6 rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 p-6 shadow-[0_30px_120px_-60px_rgba(16,185,129,0.9)] backdrop-blur">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200/70">
              የጨዋታ ውጤት
            </p>
            <h2 className="text-4xl font-black text-white sm:text-5xl">
              {isPlural
                ? `${imposterNames} ኢምፖስተሮቹ ነበሩ!`
                : `${imposterNames} ኢምፖስተሩ ነበሩ!`}
            </h2>
            <p className="text-sm text-emerald-100/80">
              እውነተኛው ቃል:{' '}
              <span className="text-base font-semibold text-white">
                {selectedWord}
              </span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {imposters.map((player) => (
              <div
                key={player.id}
                className="rounded-3xl border border-white/15 bg-slate-950/50 p-4 shadow-[0_20px_55px_-45px_rgba(6,182,212,0.8)]"
              >
                <p className="text-sm uppercase tracking-wide text-emerald-200/70">
                  ተጫዋች
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {player.name}
                </p>
                <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200">
                  🔥 ኢምፖስተር
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePlayAgain}
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-6 py-4 text-lg font-semibold text-white shadow-[0_22px_60px_-40px_rgba(6,182,212,0.9)] transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            🔁 እንደገና ይጫወቱ
          </button>
        </section>

        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_90px_-55px_rgba(59,130,246,0.65)] backdrop-blur">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              የድምጽ ማጠቃለያ
            </p>
            <div className="grid gap-4">
              {voteSummary.map(({ player, votes: voteCount }) => (
                <div
                  key={player.id}
                  className={[
                    'flex items-center justify-between rounded-2xl border px-4 py-3 shadow-[0_18px_45px_-40px_rgba(6,182,212,0.8)]',
                    player.isImposter
                      ? 'border-emerald-400/50 bg-emerald-500/10'
                      : 'border-white/10 bg-slate-950/40',
                  ].join(' ')}
                >
                  <div>
                    <p className="text-base font-semibold text-white">
                      {player.name}
                    </p>
                    {player.isImposter && (
                      <p className="text-[0.65rem] uppercase tracking-wide text-emerald-200">
                        ኢምፖስተር
                      </p>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-emerald-300">
                    {voteCount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">
            {highestVote > 0 ? (
              <p>
                ብዙዎቹ የመጣሉት:{' '}
                <span className="font-semibold text-white">{mostVoted}</span>
              </p>
            ) : (
              <p>ማንም ተጫዋች የተመረጠ አልተገኘም።</p>
            )}
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-[-20%] h-96 w-96 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -bottom-20 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-teal-400/10 blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-6 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(16,185,129,0.15)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-emerald-300/80">
              የኢምፖስተር ጨዋታ
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                በአማርኛ የቃላት ኢምፖስተር ጨዋታ
              </h1>
              <p className="text-base leading-relaxed text-slate-300 sm:max-w-xl">
                ቡድኑን ሰብስቡ፣ ኢምፖስተሩ ማን እንደሆነ ተዋወቁ፣ በስምንት ሳንቃ የተስፋፋ ዘመናዊ ካርድ ቅርጸ ተዋረዳን ይሞክሩ።
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-200 md:w-auto md:items-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              ቃላት {remainingWords.toLocaleString('am-ET')}
            </span>
            <p className="text-center text-base text-slate-300 md:text-right">
              ተጫዋቾችን ያዘጋጁ፣ ካርዱን ይጀምሩ።
            </p>
            {stage !== 'setup' && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-400/10 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                ጨዋታን ዳግም ጀምር
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 pb-10">
          <div className="mx-auto grid max-w-5xl gap-6">
            {error && (
              <div className="rounded-3xl border border-rose-500/40 bg-rose-500/15 px-6 py-4 text-sm font-medium text-rose-100 shadow-[0_16px_50px_-24px_rgba(244,63,94,0.8)]">
                {error}
              </div>
            )}

            <section className="grid gap-6">
              {stage === 'setup' && renderSetup()}
              {stage === 'reveal' && renderReveal()}
              {stage === 'voting' && renderVoting()}
              {stage === 'result' && renderResult()}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

