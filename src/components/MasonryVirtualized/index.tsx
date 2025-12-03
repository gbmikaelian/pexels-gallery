"use client";

import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ESTIMATED_CARD_HEIGHT,
  MAX_COLUMNS,
  MIN_COLUMN_WIDTH,
} from "@/constants";
import { Photo } from "../../types/photos";

import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { calculateVisibleItems } from "@/helpers/calculateVisibleItems";
import {
  GridContainer,
  FlexContainer,
  Column,
  PhotoCard,
  Image,
} from "./MasonryStyles";

export interface MasonryVirtualizedProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  buffer?: number;
  onBottomReached?: () => void;
}

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

const WrappedImage = ({ src, alt, width, height }: Props) => {
  return (
    <Image src={src} alt={alt} width={width} height={height} loading="lazy" />
  );
};

const MasonryVirtualized: FC<MasonryVirtualizedProps> = ({
  photos,
  onPhotoClick,
  buffer = 3,
  onBottomReached,
}) => {
  const [columns, setColumns] = useState<Photo[][]>([]);
  const [numColumns, setNumColumns] = useState(3);
  const [columnHeights, setColumnHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;

    const maxColumnsWidth = Math.floor(containerWidth / MAX_COLUMNS);

    const newNumColumns = Math.max(
      1,
      Math.floor(
        containerWidth /
          (MIN_COLUMN_WIDTH > maxColumnsWidth
            ? MIN_COLUMN_WIDTH
            : maxColumnsWidth)
      )
    );
    setNumColumns(newNumColumns);

    const newColumns: Photo[][] = Array.from(
      { length: newNumColumns },
      () => []
    );
    const newHeights: number[] = Array(newNumColumns).fill(0);

    photos.forEach((photo) => {
      const shortestIndex = newHeights.indexOf(Math.min(...newHeights));
      newColumns[shortestIndex].push(photo);
      newHeights[shortestIndex] +=
        (photo.height / photo.width) * (containerWidth / newNumColumns);
    });
    setColumns(newColumns);
    setColumnHeights(newHeights);
  }, [photos]);

  useEffect(() => {
    calculateColumns();
    window.addEventListener("resize", calculateColumns);
    return () => window.removeEventListener("resize", calculateColumns);
  }, [calculateColumns, photos]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      setScrollTop(containerRef.current.scrollTop);
      setViewportHeight(containerRef.current.clientHeight);
    };
    const ref = containerRef.current;
    if (ref) {
      ref.addEventListener("scroll", handleScroll);
      setViewportHeight(ref.clientHeight);
    }
    return () => {
      if (ref) ref.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [sentinelRef] = useInfiniteScroll({
    threshold: 0.1,
    onIntersect: () => {
      onBottomReached?.();
    },
  });

  const minHeight = Math.max(...columnHeights, ESTIMATED_CARD_HEIGHT * 3);

  return (
    <GridContainer
      ref={containerRef}
      height="calc(100vh - 100px)"
      $overflowX="auto"
    >
      <FlexContainer
        $alignItems="flex-start"
        $position="relative"
        $minHeight={minHeight}
      >
        {columns.map((column, columnIndex) => {
          const colWidth = containerRef.current
            ? containerRef.current.offsetWidth / numColumns
            : MIN_COLUMN_WIDTH;
          const visiblePhotos = calculateVisibleItems<Photo>(
            column,
            colWidth,
            scrollTop,
            viewportHeight,
            buffer
          );

          return (
            <Column key={columnIndex} $minHeight={columnHeights[columnIndex]}>
              {visiblePhotos.map(({ item, top, height }) => (
                <PhotoCard
                  key={item.id}
                  height={height}
                  $top={top}
                  onClick={() => onPhotoClick(item)}
                >
                  <WrappedImage
                    src={item.src.large}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                  />
                </PhotoCard>
              ))}
            </Column>
          );
        })}
      </FlexContainer>
      <div ref={sentinelRef} />
    </GridContainer>
  );
};

export default memo(MasonryVirtualized);
