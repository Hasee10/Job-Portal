'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PER_PAGE_OPTIONS = [10, 20, 50];

export function TenderControls() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = searchParams.get('sort') === 'deadline' ? 'deadline' : 'newest';
  const perPage = Number.parseInt(searchParams.get('perPage') || '20', 10);
  const validPerPage = PER_PAGE_OPTIONS.includes(perPage) ? perPage : 20;

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    params.delete('page');
    router.push(`/procurement/tenders?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="hidden text-muted-foreground text-xs sm:inline">Per page:</label>
        <Select onValueChange={(v) => updateParam('perPage', v)} value={validPerPage.toString()}>
          <SelectTrigger aria-label="Tenders per page" className="h-8 w-[70px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt.toString()}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <label className="hidden text-muted-foreground text-xs sm:inline">Sort:</label>
        <Select onValueChange={(v) => updateParam('sort', v)} value={sort}>
          <SelectTrigger aria-label="Sort tenders" className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="deadline">Deadline soonest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
