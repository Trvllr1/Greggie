import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';

vi.mock('../../services/api', () => ({
  getRecentProducts: vi.fn(),
  searchProducts: vi.fn(),
  saveProduct: vi.fn(),
  unsaveProduct: vi.fn(),
}));

import * as api from '../../services/api';
import { BrowseFeed } from '../BrowseFeed';
import type { Product } from '../../data/mockData';

const asMock = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const makeProduct = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Item ${id}`,
  price: 19.99,
  inventory: 1,
  mediaUrl: `https://cdn/${id}.jpg`,
  description: '',
  saleType: 'buy_now',
  locationZip: '94103',
  isSaved: false,
  ...overrides,
});

describe('BrowseFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(api.getRecentProducts).mockResolvedValue([]);
    asMock(api.searchProducts).mockResolvedValue([]);
  });
  afterEach(() => {
    cleanup();
  });

  it('renders products returned from getRecentProducts', async () => {
    asMock(api.getRecentProducts).mockResolvedValue([
      makeProduct('p1', { name: 'Vintage chair' }),
      makeProduct('p2', { name: 'Bike' }),
    ]);

    render(<BrowseFeed onViewProduct={() => {}} />);

    await waitFor(() => {
      expect(screen.queryByText('Vintage chair')).not.toBeNull();
      expect(screen.queryByText('Bike')).not.toBeNull();
    });
    expect(api.getRecentProducts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 24, offset: 0 }),
    );
  });

  it('optimistically toggles save and calls saveProduct', async () => {
    asMock(api.getRecentProducts).mockResolvedValue([makeProduct('p1')]);
    asMock(api.saveProduct).mockResolvedValue({ saved: true });

    render(<BrowseFeed onViewProduct={() => {}} />);

    await waitFor(() => expect(screen.queryByText('Item p1')).not.toBeNull());

    const heart = screen.getByLabelText('Save');
    await act(async () => {
      fireEvent.click(heart);
    });

    await waitFor(() => expect(api.saveProduct).toHaveBeenCalledWith('p1'));
    // After save, button label should flip to "Unsave".
    expect(screen.queryByLabelText('Unsave')).not.toBeNull();
  });

  it('falls back to searchProducts when query typed', async () => {
    asMock(api.getRecentProducts).mockResolvedValue([]);
    asMock(api.searchProducts).mockResolvedValue([makeProduct('s1', { name: 'Searched' })]);

    render(<BrowseFeed onViewProduct={() => {}} />);
    await waitFor(() => expect(api.getRecentProducts).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/search marketplace/i), {
      target: { value: 'chair' },
    });

    await waitFor(() =>
      expect(api.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'chair', sort: 'newest' }),
      ),
    );
  });

  it('toggling Near me adds lat/lng/radiusKm to the recent feed query', async () => {
    asMock(api.getRecentProducts).mockResolvedValue([]);
    const getCurrentPosition = vi.fn((cb: PositionCallback) => {
      cb({
        coords: {
          latitude: 37.77,
          longitude: -122.42,
          accuracy: 10, altitude: null, altitudeAccuracy: null,
          heading: null, speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });
    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    render(<BrowseFeed onViewProduct={() => {}} />);
    await waitFor(() => expect(api.getRecentProducts).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /near me/i }));
    });

    await waitFor(() => {
      const calls = asMock(api.getRecentProducts).mock.calls;
      const last = calls[calls.length - 1][0];
      expect(last).toMatchObject({
        lat: 37.77,
        lng: -122.42,
        radiusKm: 40,
      });
    });
  });
});
