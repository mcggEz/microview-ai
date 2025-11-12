export type StrasingerQuantRow = {
  item: string
  quantitated: string
  categories: {
    none?: string
    rare?: string
    few?: string
    moderate?: string
    many?: string
  }
  note?: string
}

export const strasingerReferenceTable: StrasingerQuantRow[] = [
  {
    item: 'Epithelial cells',
    quantitated: 'per LPF',
    categories: {
      none: '0',
      rare: '0-5',
      few: '5-20',
      moderate: '20-100',
      many: '>100'
    }
  },
  {
    item: 'Crystals (normal)',
    quantitated: 'per HPF',
    categories: {
      none: '0',
      rare: '0-2',
      few: '2-5',
      moderate: '5-20',
      many: '>20'
    }
  },
  {
    item: 'Bacteria',
    quantitated: 'per HPF',
    categories: {
      none: '0',
      rare: '0-10',
      few: '10-50',
      moderate: '50-200',
      many: '>200'
    }
  },
  {
    item: 'Mucus threads',
    quantitated: 'per LPF',
    categories: {
      none: '0',
      rare: '0-1',
      few: '1-3',
      moderate: '3-10',
      many: '>10'
    }
  },
  {
    item: 'Casts',
    quantitated: 'per LPF',
    categories: {
      none: '0',
      rare: '0-2',
      few: '2-5',
      moderate: '5-10',
      many: '>10'
    },
    note: 'Use numerical ranges when reporting cast counts.'
  },
  {
    item: 'RBCs',
    quantitated: 'per HPF',
    categories: {
      none: '0-2',
      rare: '2-5',
      few: '5-10',
      moderate: '10-25',
      many: '25-50'
    },
    note: 'Extended ranges: 50-100, >100 indicate marked hematuria.'
  },
  {
    item: 'WBCs',
    quantitated: 'per HPF',
    categories: {
      none: '0-2',
      rare: '2-5',
      few: '5-10',
      moderate: '10-25',
      many: '25-50'
    },
    note: 'Extended ranges: 50-100, >100 indicate marked pyuria.'
  },
  {
    item: 'Squamous epithelial cells',
    quantitated: 'per LPF',
    categories: {
      none: 'None',
      rare: 'Rare',
      few: 'Few',
      moderate: 'Moderate',
      many: 'Many'
    }
  },
  {
    item: 'Transitional epithelial cells, yeasts, Trichomonas',
    quantitated: 'per HPF',
    categories: {
      none: 'None',
      rare: 'Rare',
      few: 'Few',
      moderate: 'Moderate',
      many: 'Many'
    }
  },
  {
    item: 'Renal tubular epithelial cells',
    quantitated: 'Average number per 10 HPFs',
    categories: {
      none: '0',
      rare: '0-1',
      few: '1-3',
      moderate: '3-5',
      many: '>5'
    }
  },
  {
    item: 'Oval fat bodies',
    quantitated: 'Average number per HPF',
    categories: {
      none: '0',
      rare: '0-1',
      few: '1-3',
      moderate: '3-5',
      many: '>5'
    }
  },
  {
    item: 'Abnormal crystals, casts',
    quantitated: 'Average number per LPF',
    categories: {
      none: '0',
      rare: '0-1',
      few: '1-3',
      moderate: '3-5',
      many: '>5'
    }
  }
]
