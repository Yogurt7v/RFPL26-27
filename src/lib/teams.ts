export interface Team {
  id: number
  name: string
  shortName: string
  city: string
  logo: string
  logoLarge: string
}

export const teams: Team[] = [
  { id: 1, name: 'Акрон', shortName: 'АКР', city: 'Самара', logo: '/icons/teams/small/akron.png', logoLarge: '/icons/teams/large/akron.png' },
  { id: 2, name: 'Ахмат', shortName: 'АХМ', city: 'Грозный', logo: '/icons/teams/small/ahmat.png', logoLarge: '/icons/teams/large/ahmat.png' },
  { id: 3, name: 'Балтика', shortName: 'БАЛ', city: 'Калининград', logo: '/icons/teams/small/baltika.png', logoLarge: '/icons/teams/large/baltika.png' },
  { id: 4, name: 'Динамо Махачкала', shortName: 'ДИН-М', city: 'Махачкала', logo: '/icons/teams/small/dinamo-makhachkala.png', logoLarge: '/icons/teams/large/dinamo-makhachkala.png' },
  { id: 5, name: 'Динамо Москва', shortName: 'ДИН', city: 'Москва', logo: '/icons/teams/small/dinamo-moscow.png', logoLarge: '/icons/teams/large/dinamo-moscow.png' },
  { id: 6, name: 'Зенит', shortName: 'ЗЕН', city: 'Санкт-Петербург', logo: '/icons/teams/small/zenit.png', logoLarge: '/icons/teams/large/zenit.png' },
  { id: 7, name: 'Краснодар', shortName: 'КРА', city: 'Краснодар', logo: '/icons/teams/small/krasnodar.png', logoLarge: '/icons/teams/large/krasnodar.png' },
  { id: 8, name: 'Крылья Советов', shortName: 'КРС', city: 'Самара', logo: '/icons/teams/small/krilya-sovetov.png', logoLarge: '/icons/teams/large/krilya-sovetov.png' },
  { id: 9, name: 'Локомотив Москва', shortName: 'ЛОК', city: 'Москва', logo: '/icons/teams/small/lokomotiv.png', logoLarge: '/icons/teams/large/lokomotiv.png' },
  { id: 10, name: 'Оренбург', shortName: 'ОРН', city: 'Оренбург', logo: '/icons/teams/small/orenburg.png', logoLarge: '/icons/teams/large/orenburg.png' },
  { id: 11, name: 'Родина', shortName: 'РОД', city: 'Москва', logo: '/icons/teams/small/rodina.png', logoLarge: '/icons/teams/large/rodina.png' },
  { id: 12, name: 'Ростов', shortName: 'РОС', city: 'Ростов-на-Дону', logo: '/icons/teams/small/rostov.png', logoLarge: '/icons/teams/large/rostov.png' },
  { id: 13, name: 'Рубин', shortName: 'РУБ', city: 'Казань', logo: '/icons/teams/small/rubin.png', logoLarge: '/icons/teams/large/rubin.png' },
  { id: 14, name: 'Спартак Москва', shortName: 'СПА', city: 'Москва', logo: '/icons/teams/small/spartak.png', logoLarge: '/icons/teams/large/spartak.png' },
  { id: 15, name: 'Факел', shortName: 'ФАК', city: 'Воронеж', logo: '/icons/teams/small/fakel.png', logoLarge: '/icons/teams/large/fakel.png' },
  { id: 16, name: 'ЦСКА Москва', shortName: 'ЦСК', city: 'Москва', logo: '/icons/teams/small/cska.png', logoLarge: '/icons/teams/large/cska.png' },
]

export const getTeamById = (id: number): Team | undefined =>
  teams.find(team => team.id === id)

export const getTeamByName = (name: string): Team | undefined =>
  teams.find(team => team.name === name)
