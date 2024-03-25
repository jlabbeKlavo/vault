import { Ledger, JSON, Crypto } from "@klave/sdk";
import { emit, index, revert } from "../klave/types"
import { Wallet } from "./wallet";
import { ChainedItems } from "../klave/chained";
import { ChainedWalletUsers, WalletUser } from "./wallletUser";
import { encode as b64encode } from 'as-base64/assembly';
import { convertToUint8Array } from "../klave/helpers";

const UsersTable = "UsersTable";

/**
 * Roles of the user in the vault
 * - admin: can manage the vault and its wallets
 * - user: can access one or more wallets
 */
@JSON
export class VaultUser {
    id: string;
    role: string;   //as in role for the vault itself, can be user of the vault and admin of a wallet
    wallets: ChainedWalletUsers;    

    constructor() {
        this.id = "";
        this.role = "";
        this.wallets = new ChainedWalletUsers();
    }

    static load(userId: string) : VaultUser | null {
        let userTable = Ledger.getTable(UsersTable).get(userId);
        if (userTable.length == 0) {
            revert(`User ${userId} does not exist. Create it first`);
            return null;
        }
        let user = JSON.parse<VaultUser>(userTable);        
        emit(`User loaded successfully: '${user.id}'`);
        return user;
    }

    save(): void {
        let userTable = JSON.stringify<VaultUser>(this);
        Ledger.getTable(UsersTable).set(this.id, userTable);
        emit(`User saved successfully: '${this.id}'`);
    }

    static delete(userId: string): void {
        let user = VaultUser.load(userId);
        if (!user) {
            return;
        }        
        user.wallets.reset();
        Ledger.getTable(UsersTable).unset(userId);
        emit(`User deleted successfully: '${userId}'`);
    }

    static create(role: string): VaultUser {
        let user = new VaultUser();
        user.id = b64encode(convertToUint8Array(Crypto.getRandomValues(64)));
        user.role = role;
        user.save();
        emit(`User created successfully: '${user.id}'`);
        return user;
    }

    findWalletIndex(walletId: string): index {
        return this.wallets.includes(walletId);
    }

    addWallet(walletId: string, role: string): boolean {
        if (this.wallets.includes(walletId)) {
            revert("User already has a profile for this wallet");
            return false;
        }
        let walletUser = new WalletUser(walletId, role);
        walletUser.save();

        this.wallets.add(walletUser);

        emit(`Wallet successfully added to user: '${this.id}'`);
        return true;
    }

    removeWallet(walletId: string): boolean {
        if (!this.wallets.includes(walletId)) {
            revert("User does not have a profile for this wallet");
            return false;
        }
        this.wallets.remove(walletId);
        emit(`Wallet successfully removed from user: '${this.id}'`);
        return true;
    }
}

export class ChainedVaultUsers extends ChainedItems<VaultUser> {
    constructor() {
        super();
    }    

    includes(id: string): boolean {
        let all = this.getAll();
        for (let i = 0; i < all.length; i++) {            
            let item = all[i];
            if (item.id == id) {
                return true;
            }
        }
        return false;
    }

    remove(userId: string): void {
        let all = this.getAll();
        for (let i = 0; i < all.length; i++) {
            let item = all[i];
            if (item.id == userId) {
                this.removeIndex(i);
                break;
            }
        }
    }
}