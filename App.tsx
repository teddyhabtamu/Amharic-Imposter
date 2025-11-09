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

  const imposter = assignments.find((player) => player.isImposter) ?? null

  const adjustPlayerCount = (count: number) => {
    const safeCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, count))
    setPlayerCount(safeCount)
    setPlayerNames((prev) => ensureNameList(safeCount, prev))
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

    setPlayerNames(sanitizedNames)

    const imposterIndex = Math.floor(Math.random() * sanitizedNames.length)
    const word = pickRandomWord()

    const nextAssignments = sanitizedNames.map((name, index) => ({
      id: index,
      name,
      isImposter: index === imposterIndex,
      word: index === imposterIndex ? null : word,
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
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">
          ጨዋታን ይጀምሩ።
        </h2>
        <p className="text-sm text-slate-300">
          ተጫዋቾች ቁጥርን ያስገቡ፣ ስማቸውን ያስተካክሉ እና ዝግጁ ሲሆኑ{' '}
          <span className="text-emerald-300">“ጨዋታ ጀምር”</span> ይንኩ።
        </p>
      </section>

      <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">
              ተጫዋቾች ቁጥር
            </p>
            <p className="text-3xl font-bold text-emerald-300">
              {playerCount}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjustPlayerCount(playerCount - 1)}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="w-20 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-center text-lg font-semibold text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
            <button
              type="button"
              onClick={() => adjustPlayerCount(playerCount + 1)}
              className="rounded-full border border-white/10 bg-emerald-400/80 px-4 py-2 text-xl font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={playerCount >= MAX_PLAYERS}
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-emerald-200">
            ተጫዋቾች ስሞች
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {ensureNameList(playerCount, playerNames).map((name, index) => (
              <input
                key={index}
                value={name}
                onChange={(event) => handleNameChange(index, event.target.value)}
                placeholder={createDefaultName(index)}
                className="rounded-xl border border-white/5 bg-slate-900/60 px-4 py-2 text-base text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartGame}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 px-6 py-3 text-lg font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-teal-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        >
          🎮 ጨዋታ ጀምር
        </button>
      </div>
    </div>
  )

  const renderReveal = () => {
    const currentPlayer = assignments[currentRevealIndex]

    if (!currentPlayer) {
      return null
    }

    return (
      <div className="space-y-8">
        <section className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            ዙር {currentRevealIndex + 1} / {assignments.length}
          </p>
          <h2 className="text-3xl font-semibold text-white">
            {currentPlayer.name} ይጠብቁ!
          </h2>
          <p className="text-sm text-slate-300">
            በትክክል ተዘጋጁ፣ ቃሉ በእርሱ ብቻ ይታይ። በኋላ ወደ ቀጣይ ተጫዋች ይተላለፉ።
          </p>
        </section>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-2xl shadow-emerald-500/10">
          <p className="text-lg font-semibold text-slate-300">
            ቃሉን ለማየት እባክዎን ይንኩ።
          </p>

          <div className="relative mx-auto flex h-48 w-full max-w-sm items-center justify-center rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900">
            {wordRevealed ? (
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-wide text-slate-400">
                  የእርስዎ ቃል
                </p>
                <p className="text-4xl font-bold text-emerald-300">
                  {currentPlayer.word ?? '???'}
                </p>
                {currentPlayer.isImposter && (
                  <p className="text-sm font-semibold text-rose-300">
                    እርስዎ ኢምፖስተሩ ናቸው! በቀላሉ ይጠብቁ።
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRevealWord}
                className="rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-lg font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                ቃሉን አሳይ
              </button>
            )}
          </div>

          {wordRevealed && (
            <button
              type="button"
              onClick={handleNextPlayer}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-400/90 px-6 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              ሰውዬውን ቀጥል →
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderVoting = () => {
    const currentVoter = assignments[currentVoterIndex]

    if (!currentVoter) {
      return null
    }

    return (
      <div className="space-y-8">
        <section className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            የመለያየት መስጫ {currentVoterIndex + 1} / {assignments.length}
          </p>
          <h2 className="text-3xl font-semibold text-white">
            {currentVoter.name} ማንን ኢምፖስተር ትመስላላችሁ?
          </h2>
          <p className="text-sm text-slate-300">
            ሌሎች ተጫዋቾች የተናገሩትን የመረጃ ማቅረብ ያስታውሱ፣ ኢምፖስተሩን ይምረጡ።
          </p>
        </section>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <div className="grid gap-3 md:grid-cols-2">
            {assignments.map((player, index) => {
              const isSelected = votes[currentVoterIndex] === index
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSelectVote(index)}
                  className={[
                    'flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60',
                    isSelected
                      ? 'border-emerald-400/60 bg-emerald-400/20'
                      : 'border-white/10 bg-white/5 hover:border-emerald-400/40 hover:bg-white/10',
                  ].join(' ')}
                >
                  <span className="text-lg font-semibold text-white">
                    {player.name}
                  </span>
                  {isSelected && <span className="text-emerald-300">✓</span>}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleConfirmVote}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 px-6 py-3 text-lg font-semibold text-slate-950 transition hover:from-emerald-300 hover:to-teal-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            ድምጽ ያረጋግጡ
          </button>
        </div>
      </div>
    )
  }

  const renderResult = () => {
    if (!imposter) {
      return null
    }

    const highestVote = voteSummary.reduce(
      (max, item) => Math.max(max, item.votes),
      0,
    )
    const mostVoted = voteSummary
      .filter((item) => item.votes === highestVote && highestVote > 0)
      .map((item) => item.player.name)
      .join(', ')

    return (
      <div className="space-y-8">
        <section className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            ውጤት
          </p>
          <h2 className="text-4xl font-bold text-emerald-300">
            {imposter.name} ኢምፖስተሩ ነበሩ!
          </h2>
          <p className="text-sm text-slate-300">
            እውነተኛው ቃል: <span className="font-semibold">{selectedWord}</span>
          </p>
        </section>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <h3 className="text-lg font-semibold text-emerald-200">
            የድምጽ ሰጪዎች እይታ
          </h3>
          <div className="grid gap-4">
            {voteSummary.map(({ player, votes: voteCount }) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="text-base font-semibold text-white">
                    {player.name}
                  </p>
                  {player.isImposter && (
                    <p className="text-xs uppercase tracking-wide text-rose-300">
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

          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            {highestVote > 0 ? (
              <p>
                ብዙዎቹ የመጣሉት: <span className="font-semibold">{mostVoted}</span>
              </p>
            ) : (
              <p>ማንም ተጫዋች የተመረጠ አልተገኘም።</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlayAgain}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-lg font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        >
          እንደገና ይጫወቱ
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 py-10">
        <header className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur md:flex-row md:text-left">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
              የኢምፖስተር ጨዋታ
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
              የቃላት ተፈታትና ጨዋታ
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              በአማርኛ ቃላት የተሞላ የቡድን ማስታወቂያ ጨዋታ፣ ኢምፖስተሩን ያግኙ።
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 text-sm text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1">
              ቃላት {remainingWords.toLocaleString('am-ET')}
            </span>
            {stage !== 'setup' && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                ጨዋታን ዳግም ጀምር
              </button>
            )}
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-3xl space-y-6">
            {error && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            {stage === 'setup' && renderSetup()}
            {stage === 'reveal' && renderReveal()}
            {stage === 'voting' && renderVoting()}
            {stage === 'result' && renderResult()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

