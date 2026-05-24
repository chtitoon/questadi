import { AccountRepository } from '../repositories/AccountRepository';
import { QuoteRepository } from '../repositories/QuoteRepository';
import { RemovalRequestRepository } from '../repositories/RemovalRequestRepository';
import { QuoteLinkRepository } from '../repositories/QuoteLinkRepository';
import { GoneError, NotFoundError, PersonProfilePayload, QuoteLinkPayload } from '../types/index';

export class QuoteLinkService {
  constructor(
    private quoteLinkRepo: QuoteLinkRepository,
    private quoteRepo: QuoteRepository,
    private accountRepo: AccountRepository,
    private removalRepo: RemovalRequestRepository,
  ) {}

  async resolveToken(token: string): Promise<QuoteLinkPayload> {
    const link = await this.quoteLinkRepo.findByToken(token);
    if (!link) throw new NotFoundError('Token not found');
    if (link.expires_at < new Date()) throw new GoneError('TOKEN_EXPIRED', 'This link has expired');
    if (link.quote_deleted_at) throw new GoneError('QUOTE_DELETED', 'This quote has been removed');

    const [capturer, author, removalRequested] = await Promise.all([
      this.accountRepo.findById(link.quote_captured_by),
      this.accountRepo.findById(link.recipient),
      this.removalRepo.existsForQuote(link.quote_id),
    ]);
    const capturerFirstName = ((capturer?.full_name ?? capturer?.display_name) || 'Someone').split(' ')[0];
    const authorDisplayName = author?.full_name ?? author?.display_name ?? 'Unknown';

    return {
      quoteId: link.quote_id,
      quoteText: link.quote_text,
      authorAccountId: link.recipient,
      authorDisplayName,
      capturerFirstName,
      captured_at: link.quote_captured_at,
      is_public: link.quote_is_public,
      removal_requested: removalRequested,
      token_expires_at: link.expires_at,
    };
  }

  async getPersonProfile(accountId: string): Promise<PersonProfilePayload> {
    const [account, quotes] = await Promise.all([
      this.accountRepo.findById(accountId),
      this.quoteRepo.getPublicByPerson(accountId),
    ]);
    if (!account) throw new NotFoundError('Person not found');
    return {
      accountId,
      displayName: account.full_name ?? account.display_name,
      quotes: quotes.map(q => ({ id: q.id, text: q.text, captured_at: q.captured_at })),
    };
  }

  async acceptPublic(token: string): Promise<void> {
    const payload = await this.resolveToken(token);
    if (payload.is_public) return;
    await this.quoteRepo.setPublic(payload.quoteId);
  }

  async requestRemoval(token: string, message?: string): Promise<void> {
    const payload = await this.resolveToken(token);
    await this.removalRepo.create(payload.quoteId, message);
  }
}
