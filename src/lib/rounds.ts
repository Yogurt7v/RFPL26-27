export interface Round {
  number: number
  startDate: string
  endDate: string
  matchesCount: number
}

export const SEASON_CONFIG = {
  totalRounds: 30,
  matchesPerRound: 8,
  totalMatches: 240,
  teamsPerLeague: 16,
}

export const rounds: Round[] = [
  { number: 1, startDate: '2026-07-24', endDate: '2026-07-26', matchesCount: 8 },
  { number: 2, startDate: '2026-07-31', endDate: '2026-08-02', matchesCount: 8 },
  { number: 3, startDate: '2026-08-08', endDate: '2026-08-10', matchesCount: 8 },
  { number: 4, startDate: '2026-08-14', endDate: '2026-08-16', matchesCount: 8 },
  { number: 5, startDate: '2026-08-22', endDate: '2026-08-24', matchesCount: 8 },
  { number: 6, startDate: '2026-08-28', endDate: '2026-08-30', matchesCount: 8 },
  { number: 7, startDate: '2026-09-05', endDate: '2026-09-07', matchesCount: 8 },
  { number: 8, startDate: '2026-09-11', endDate: '2026-09-13', matchesCount: 8 },
  { number: 9, startDate: '2026-09-16', endDate: '2026-09-17', matchesCount: 8 },
  { number: 10, startDate: '2026-10-10', endDate: '2026-10-10', matchesCount: 8 },
  { number: 11, startDate: '2026-10-17', endDate: '2026-10-17', matchesCount: 8 },
  { number: 12, startDate: '2026-10-24', endDate: '2026-10-24', matchesCount: 8 },
  { number: 13, startDate: '2026-10-31', endDate: '2026-10-31', matchesCount: 8 },
  { number: 14, startDate: '2026-11-07', endDate: '2026-11-07', matchesCount: 8 },
  { number: 15, startDate: '2026-11-21', endDate: '2026-11-21', matchesCount: 8 },
  { number: 16, startDate: '2026-11-28', endDate: '2026-11-28', matchesCount: 8 },
  { number: 17, startDate: '2026-12-05', endDate: '2026-12-05', matchesCount: 8 },
  { number: 18, startDate: '2027-02-27', endDate: '2027-03-01', matchesCount: 8 },
  { number: 19, startDate: '2027-03-06', endDate: '2027-03-08', matchesCount: 8 },
  { number: 20, startDate: '2027-03-13', endDate: '2027-03-15', matchesCount: 8 },
  { number: 21, startDate: '2027-03-20', endDate: '2027-03-22', matchesCount: 8 },
  { number: 22, startDate: '2027-04-03', endDate: '2027-04-05', matchesCount: 8 },
  { number: 23, startDate: '2027-04-10', endDate: '2027-04-12', matchesCount: 8 },
  { number: 24, startDate: '2027-04-17', endDate: '2027-04-19', matchesCount: 8 },
  { number: 25, startDate: '2027-04-24', endDate: '2027-04-26', matchesCount: 8 },
  { number: 26, startDate: '2027-05-01', endDate: '2027-05-03', matchesCount: 8 },
  { number: 27, startDate: '2027-05-08', endDate: '2027-05-10', matchesCount: 8 },
  { number: 28, startDate: '2027-05-15', endDate: '2027-05-17', matchesCount: 8 },
  { number: 29, startDate: '2027-05-22', endDate: '2027-05-24', matchesCount: 8 },
  { number: 30, startDate: '2027-05-29', endDate: '2027-05-29', matchesCount: 8 },
]

export const getRoundByNumber = (number: number): Round | undefined =>
  rounds.find(round => round.number === number)

export const getCurrentRound = (currentDate: Date): Round | undefined =>
  rounds.find(r => {
    const start = new Date(r.startDate)
    const end = new Date(r.endDate)
    return currentDate >= start && currentDate <= end
  })
