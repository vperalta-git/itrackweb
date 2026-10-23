import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../constants/theme';

export function useListPagination<T>(items: T[], size = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  useEffect(() => { setPage((current) => Math.min(current, pages)); }, [pages]);
  const currentPage = Math.min(page, pages);
  return { items: items.slice((currentPage - 1) * size, currentPage * size), controls: { page: currentPage, pages, total: items.length, onChange: setPage } };
}
export function ListPagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (page: number) => void }) {
  const theme = useTheme();
  if (pages <= 1) return null;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginVertical: 12 }}>
    <Button title="Previous" variant="secondary" size="small" disabled={page <= 1} onPress={() => onChange(page - 1)} />
    <Text style={{ color: theme.colors.textMuted }}>{page} / {pages} · {total} records</Text>
    <Button title="Next" variant="secondary" size="small" disabled={page >= pages} onPress={() => onChange(page + 1)} />
  </View>;
}
