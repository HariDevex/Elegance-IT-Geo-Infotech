import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton, SkeletonGrid } from '../components/Skeleton'

describe('Skeleton Components', () => {
  it('renders Skeleton with default props', () => {
    render(<Skeleton />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders Skeleton with custom variant', () => {
    render(<Skeleton variant="text" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders SkeletonGrid', () => {
    render(<SkeletonGrid count={3} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBe(3);
  });
});
