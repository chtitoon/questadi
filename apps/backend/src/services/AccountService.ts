import { AccountRepository } from '../repositories/AccountRepository';
import { AutocompleteResultDto, toAutocompleteResultDto } from '../types/index';

export class AccountService {
  constructor(private accountRepo: AccountRepository) {}

  async searchForAutocomplete(
    query: string,
    capturerId: string,
    limit: number,
  ): Promise<AutocompleteResultDto[]> {
    const rows = await this.accountRepo.searchForAutocomplete(query, capturerId, Math.min(limit, 20));
    return rows.map(toAutocompleteResultDto);
  }
}
