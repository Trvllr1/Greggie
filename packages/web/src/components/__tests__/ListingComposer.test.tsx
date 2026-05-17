import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';

vi.mock('../../services/api', () => ({
  uploadFile: vi.fn(),
  createShopProduct: vi.fn(),
}));

if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error jsdom env
  globalThis.crypto = { randomUUID: () => 'test-uuid' };
}
if (!('createObjectURL' in URL)) {
  // @ts-expect-error patch
  URL.createObjectURL = () => 'blob:mock';
}

import * as api from '../../services/api';
import { ListingComposer } from '../ListingComposer';

const asMock = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const makeFile = (name = 'photo.jpg', type = 'image/jpeg', size = 1024) => {
  const f = new File(['x'.repeat(size)], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

const titleInput = () => screen.getByPlaceholderText(/what are you selling/i) as HTMLInputElement;
const priceInput = () => screen.getByPlaceholderText('Price') as HTMLInputElement;
const publishBtn = () => screen.getByRole('button', { name: /^publish(ing)?/i }) as HTMLButtonElement;

describe('ListingComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('publish button is disabled until photo + title + price are present', () => {
    render(<ListingComposer onClose={() => {}} onPublished={() => {}} />);
    expect(publishBtn().disabled).toBe(true);
  });

  it('uploads photo and enables publish once title + price filled', async () => {
    asMock(api.uploadFile).mockResolvedValue('https://cdn/x.jpg');
    const { container } = render(
      <ListingComposer onClose={() => {}} onPublished={() => {}} />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
    });
    await waitFor(() => expect(api.uploadFile).toHaveBeenCalledTimes(1));

    fireEvent.change(titleInput(), { target: { value: 'Vintage lamp' } });
    fireEvent.change(priceInput(), { target: { value: '25.50' } });

    expect(publishBtn().disabled).toBe(false);
  });

  it('rejects non-image files with an error', async () => {
    const { container } = render(
      <ListingComposer onClose={() => {}} onPublished={() => {}} />,
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [makeFile('doc.pdf', 'application/pdf')] },
      });
    });
    expect(api.uploadFile).not.toHaveBeenCalled();
    expect(screen.queryByText(/must be an image|image only|image file/i)).not.toBeNull();
  });

  it('publishes with price converted to cents and sale_type=buy_now', async () => {
    asMock(api.uploadFile).mockResolvedValue('https://cdn/x.jpg');
    asMock(api.createShopProduct).mockResolvedValue({
      id: 'p1', name: 'Vintage lamp', price: 25.5, inventory: 1,
      mediaUrl: 'https://cdn/x.jpg', description: '',
    });
    const onPublished = vi.fn();
    const { container } = render(
      <ListingComposer onClose={() => {}} onPublished={onPublished} />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
    });
    await waitFor(() => expect(api.uploadFile).toHaveBeenCalled());

    fireEvent.change(titleInput(), { target: { value: 'Vintage lamp' } });
    fireEvent.change(priceInput(), { target: { value: '25.50' } });
    fireEvent.change(screen.getByPlaceholderText('ZIP'), { target: { value: '94103' } });

    await act(async () => {
      fireEvent.click(publishBtn());
    });

    await waitFor(() => expect(api.createShopProduct).toHaveBeenCalledTimes(1));
    const payload = asMock(api.createShopProduct).mock.calls[0][0];
    expect(payload.name).toBe('Vintage lamp');
    expect(payload.price_cents).toBe(2550);
    expect(payload.sale_type).toBe('buy_now');
    expect(payload.image_url).toBe('https://cdn/x.jpg');
    expect(payload.location_zip).toBe('94103');
    expect(onPublished).toHaveBeenCalledTimes(1);
  });

  it('shows error when createShopProduct fails', async () => {
    asMock(api.uploadFile).mockResolvedValue('https://cdn/x.jpg');
    asMock(api.createShopProduct).mockRejectedValue(new Error('server unavailable'));
    const { container } = render(
      <ListingComposer onClose={() => {}} onPublished={() => {}} />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
    });
    await waitFor(() => expect(api.uploadFile).toHaveBeenCalled());

    fireEvent.change(titleInput(), { target: { value: 'X' } });
    fireEvent.change(priceInput(), { target: { value: '10' } });

    await act(async () => {
      fireEvent.click(publishBtn());
    });

    await waitFor(() => {
      expect(screen.queryByText(/server unavailable/i)).not.toBeNull();
    });
  });
});
