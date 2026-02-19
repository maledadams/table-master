import { RestaurantTable } from '@/types/restaurant';

interface TableDimensions {
  sizeClass: string;
  roundedClass: string;
  widthRem: number;
  heightRem: number;
}

export function getTableDimensions(
  table: Pick<RestaurantTable, 'type' | 'capacity'>,
  isMergedView?: boolean
): TableDimensions {
  if (table.type === 'circular') {
    return {
      sizeClass: 'w-[14rem] h-[14rem]',
      roundedClass: 'rounded-full',
      widthRem: 14,
      heightRem: 14,
    };
  }

  if (isMergedView) {
    return {
      sizeClass: 'w-[22rem] h-[10rem]',
      roundedClass: 'rounded-xl',
      widthRem: 22,
      heightRem: 10,
    };
  }

  switch (table.capacity) {
    case 2:
      return { sizeClass: 'w-32 h-32', roundedClass: 'rounded-xl', widthRem: 8, heightRem: 8 };
    case 4:
      return { sizeClass: 'w-48 h-32', roundedClass: 'rounded-xl', widthRem: 12, heightRem: 8 };
    case 6:
      return { sizeClass: 'w-[14rem] h-40', roundedClass: 'rounded-xl', widthRem: 14, heightRem: 10 };
    case 8:
      return { sizeClass: 'w-64 h-40', roundedClass: 'rounded-xl', widthRem: 16, heightRem: 10 };
    case 10:
      return { sizeClass: 'w-[14rem] h-[14rem]', roundedClass: 'rounded-full', widthRem: 14, heightRem: 14 };
    default:
      return { sizeClass: 'w-40 h-32', roundedClass: 'rounded-xl', widthRem: 10, heightRem: 8 };
  }
}
