export interface Team {
  id: number
  name: string
  shortName: string
  city: string
  logo: string
  logoLarge: string
  soccer365Id: number
}

export const teams: Team[] = [
  { id: 1, name: 'Акрон', shortName: 'АКР', city: 'Самара', logo: '/icons/teams/small/akron.png', logoLarge: '/icons/teams/large/akron.png', soccer365Id: 15567 },
  { id: 2, name: 'Ахмат', shortName: 'АХМ', city: 'Грозный', logo: '/icons/teams/small/ahmat.png', logoLarge: '/icons/teams/large/ahmat.png', soccer365Id: 161 },
  { id: 3, name: 'Балтика', shortName: 'БАЛ', city: 'Калининград', logo: '/icons/teams/small/baltika.png', logoLarge: '/icons/teams/large/baltika.png', soccer365Id: 10 },
  { id: 4, name: 'Динамо Махачкала', shortName: 'ДИН-М', city: 'Махачкала', logo: '/icons/teams/small/dinamo-makhachkala.png', logoLarge: '/icons/teams/large/dinamo-makhachkala.png', soccer365Id: 10577 },
  { id: 5, name: 'Динамо Москва', shortName: 'ДИН', city: 'Москва', logo: '/icons/teams/small/dinamo-moscow.png', logoLarge: '/icons/teams/large/dinamo-moscow.png', soccer365Id: 277 },
  { id: 6, name: 'Зенит', shortName: 'ЗЕН', city: 'Санкт-Петербург', logo: '/icons/teams/small/zenit.png', logoLarge: '/icons/teams/large/zenit.png', soccer365Id: 52 },
  { id: 7, name: 'Краснодар', shortName: 'КРА', city: 'Краснодар', logo: '/icons/teams/small/krasnodar.png', logoLarge: '/icons/teams/large/krasnodar.png', soccer365Id: 315 },
  { id: 8, name: 'Крылья Советов', shortName: 'КРС', city: 'Самара', logo: '/icons/teams/small/krilya-sovetov.png', logoLarge: '/icons/teams/large/krilya-sovetov.png', soccer365Id: 69 },
  { id: 9, name: 'Локомотив Москва', shortName: 'ЛОК', city: 'Москва', logo: '/icons/teams/small/lokomotiv.png', logoLarge: '/icons/teams/large/lokomotiv.png', soccer365Id: 85 },
  { id: 10, name: 'Оренбург', shortName: 'ОРН', city: 'Оренбург', logo: '/icons/teams/small/orenburg.png', logoLarge: '/icons/teams/large/orenburg.png', soccer365Id: 6900 },
  { id: 11, name: 'Родина', shortName: 'РОД', city: 'Москва', logo: '/icons/teams/small/rodina.png', logoLarge: '/icons/teams/large/rodina.png', soccer365Id: 15624 },
  { id: 12, name: 'Ростов', shortName: 'РОС', city: 'Ростов-на-Дону', logo: '/icons/teams/small/rostov.png', logoLarge: '/icons/teams/large/rostov.png', soccer365Id: 133 },
  { id: 13, name: 'Рубин', shortName: 'РУБ', city: 'Казань', logo: '/icons/teams/small/rubin.png', logoLarge: '/icons/teams/large/rubin.png', soccer365Id: 134 },
  { id: 14, name: 'Спартак Москва', shortName: 'СПА', city: 'Москва', logo: '/icons/teams/small/spartak.png', logoLarge: '/icons/teams/large/spartak.png', soccer365Id: 151 },
  { id: 15, name: 'Факел', shortName: 'ФАК', city: 'Воронеж', logo: '/icons/teams/small/fakel.png', logoLarge: '/icons/teams/large/fakel.png', soccer365Id: 7402 },
  { id: 16, name: 'ЦСКА Москва', shortName: 'ЦСК', city: 'Москва', logo: '/icons/teams/small/cska.png', logoLarge: '/icons/teams/large/cska.png', soccer365Id: 182 },
]

export const getTeamById = (id: number): Team | undefined =>
  teams.find(team => team.id === id)

export const getTeamByName = (name: string): Team | undefined =>
  teams.find(team => team.name === name)
