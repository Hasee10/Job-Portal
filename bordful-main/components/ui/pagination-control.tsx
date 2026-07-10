'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { PAGINATION_DELTA } from '@/lib/constants/defaults';
import { usePagination } from '@/lib/hooks/usePagination';

type PaginationControlProps = {
  totalItems: number;
  itemsPerPage: number;
  className?: string;
};

export function PaginationControl({
  totalItems,
  itemsPerPage,
  className,
}: PaginationControlProps) {
  const { page, setPage } = usePagination();

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Calculate pagination range
  const getPaginationRange = (current: number, total: number) => {
    const delta = PAGINATION_DELTA;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === PAGINATION_DELTA + 1) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
  };

  // Ensure current page is valid
  if (page < 1 || (totalPages > 0 && page > totalPages)) {
    setPage(Math.max(1, Math.min(page, totalPages)));
    return null;
  }

  return (
    <div
      className={`mt-8 flex justify-center sm:justify-start ${className || ''}`}
    >
      <Pagination>
        <PaginationContent className="flex gap-2">
            <PaginationItem>
              <PaginationPrevious
                className={`transition-colors hover:bg-gray-100 ${
                  page === 1 ? 'pointer-events-none opacity-50' : ''
                }`}
                href={`?page=${page - 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page - 1);
                }}
              />
            </PaginationItem>

            {getPaginationRange(page, totalPages).map((pageNum, idx) =>
              pageNum === '...' ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    className="transition-colors hover:bg-gray-100"
                    href={`?page=${pageNum}`}
                    isActive={page === pageNum}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(pageNum as number);
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                className={`transition-colors hover:bg-gray-100 ${
                  page === totalPages ? 'pointer-events-none opacity-50' : ''
                }`}
                href={`?page=${page + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page + 1);
                }}
              />
            </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
