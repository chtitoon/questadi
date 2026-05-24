import { AccountRepository, deriveInitials } from '../repositories/AccountRepository';
import { QuoteRepository, LibraryRow } from '../repositories/QuoteRepository';
import { NotificationService } from './NotificationService';
import {
  Account,
  AttributedToInput,
  CreateQuoteRequest,
  ForbiddenError,
  LibraryPersonGroupDto,
  LibraryResponseDto,
  NotFoundError,
  Quote,
  QuoteDto,
  toAccountDto,
  toQuoteDto,
} from '../types/index';

function rowToAccountDto(row: LibraryRow) {
  return toAccountDto({
    id: row.a_id!,
    display_name: row.a_display_name!,
    full_name: row.a_full_name,
    phone: row.a_phone,
    contact_id: null,
    avatar_initials: row.a_avatar_initials!,
    registered: row.a_registered!,
    created_at: row.a_created_at!,
    last_active: row.a_last_active,
    created_by: row.a_created_by,
  });
}

export class QuoteService {
  constructor(
    private quoteRepo: QuoteRepository,
    private accountRepo: AccountRepository,
    private notifService: NotificationService,
  ) {}

  async createQuote(
    capturedById: string,
    request: CreateQuoteRequest,
  ): Promise<{ quote: QuoteDto; isDuplicate: boolean }> {
    const capturer = await this.accountRepo.findById(capturedById);
    if (!capturer?.registered) {
      throw new ForbiddenError('Only registered accounts can capture quotes');
    }

    const attributedToId = await this.resolveAttributedTo(request.attributedTo, capturedById);

    const duplicate = await this.quoteRepo.findDuplicate(capturedById, attributedToId, request.text);
    if (duplicate) {
      return { quote: toQuoteDto(duplicate), isDuplicate: true };
    }

    const quote = await this.quoteRepo.create({
      text: request.text,
      captured_by: capturedById,
      attributed_to: attributedToId,
    });

    this.notifService.dispatchAsync(quote.id);

    return { quote: toQuoteDto(quote), isDuplicate: false };
  }

  async getLibrary(capturedById: string): Promise<LibraryResponseDto> {
    const rows = await this.quoteRepo.getLibrary(capturedById);
    const groups = new Map<string, LibraryPersonGroupDto>();
    const unattributed: QuoteDto[] = [];

    for (const row of rows) {
      if (!row.attributed_to || !row.a_id) {
        unattributed.push(toQuoteDto(row));
        continue;
      }
      if (!groups.has(row.attributed_to)) {
        groups.set(row.attributed_to, {
          person: rowToAccountDto(row),
          quotes: [],
          lastQuotedAt: row.captured_at.toISOString(),
        });
      }
      groups.get(row.attributed_to)!.quotes.push(toQuoteDto(row));
    }

    const people = Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastQuotedAt).getTime() - new Date(a.lastQuotedAt).getTime(),
    );

    return { people, unattributed };
  }

  async softDelete(id: string, capturedById: string): Promise<void> {
    const quote = await this.quoteRepo.softDelete(id, capturedById);
    if (!quote) throw new NotFoundError('Quote not found or already deleted');
  }

  private async resolveAttributedTo(
    input: AttributedToInput | undefined,
    capturedById: string,
  ): Promise<string | null> {
    if (!input) return null;
    if ('existingId' in input) return input.existingId!;
    if ('phone' in input) {
      const account = await this.accountRepo.upsertByPhone(
        input.phone!,
        input.displayName!,
        deriveInitials(input.displayName!),
        capturedById,
      );
      return account.id;
    }
    if ('displayName' in input) {
      const account = await this.accountRepo.createAnonymous(
        input.displayName!,
        deriveInitials(input.displayName!),
        capturedById,
      );
      return account.id;
    }
    return null;
  }
}
