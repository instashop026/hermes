import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ActivityItem, AdRewardInput, AdRewardIntent, AppSession, ClaimResult, EquipItemBody, ErrorResponse, FollowModel200, FollowModelBody, FollowStyleBody, GetSocial200, HealthStatus, MinerState, MinerUpgradeInput, PostInteraction200, PostInteractionBody, PurchaseItemBody, RecordView200, RecordViewBody, RevealTap200, RevealTapBody, RevealUnlock200, RevealUnlockBody, RewardResult, SetMuteBody, TelegramAuthInput, TelegramWebhookUpdate, UpgradeResult, UserProfile, WheelSpin200 } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAuthenticateTelegramUrl: () => string;
/**
 * @summary Authenticate with Telegram Mini App initData
 */
export declare const authenticateTelegram: (telegramAuthInput: TelegramAuthInput, options?: Parameters<typeof customFetch>[1]) => Promise<AppSession>;
export declare const getAuthenticateTelegramMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authenticateTelegram>>, TError, {
        data: BodyType<TelegramAuthInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authenticateTelegram>>, TError, {
    data: BodyType<TelegramAuthInput>;
}, TContext>;
export type AuthenticateTelegramMutationResult = NonNullable<Awaited<ReturnType<typeof authenticateTelegram>>>;
export type AuthenticateTelegramMutationBody = BodyType<TelegramAuthInput>;
export type AuthenticateTelegramMutationError = ErrorType<ErrorResponse>;
/**
* @summary Authenticate with Telegram Mini App initData
*/
export declare const useAuthenticateTelegram: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authenticateTelegram>>, TError, {
        data: BodyType<TelegramAuthInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof authenticateTelegram>>, TError, {
    data: BodyType<TelegramAuthInput>;
}, TContext>;
export declare const getAuthenticatePreviewUrl: () => string;
/**
 * Creates a development-only preview account for direct browser access. Disabled in production.
 * @summary Authenticate a browser preview session
 */
export declare const authenticatePreview: (options?: Parameters<typeof customFetch>[1]) => Promise<AppSession>;
export declare const getAuthenticatePreviewMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authenticatePreview>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof authenticatePreview>>, TError, void, TContext>;
export type AuthenticatePreviewMutationResult = NonNullable<Awaited<ReturnType<typeof authenticatePreview>>>;
export type AuthenticatePreviewMutationError = ErrorType<ErrorResponse>;
/**
* @summary Authenticate a browser preview session
*/
export declare const useAuthenticatePreview: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof authenticatePreview>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof authenticatePreview>>, TError, void, TContext>;
export declare const getReceiveTelegramWebhookUrl: () => string;
/**
 * Public webhook endpoint authenticated by Telegram's webhook secret header.
 * @summary Receive Telegram Bot API updates
 */
export declare const receiveTelegramWebhook: (telegramWebhookUpdate: TelegramWebhookUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getReceiveTelegramWebhookMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof receiveTelegramWebhook>>, TError, {
        data: BodyType<TelegramWebhookUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof receiveTelegramWebhook>>, TError, {
    data: BodyType<TelegramWebhookUpdate>;
}, TContext>;
export type ReceiveTelegramWebhookMutationResult = NonNullable<Awaited<ReturnType<typeof receiveTelegramWebhook>>>;
export type ReceiveTelegramWebhookMutationBody = BodyType<TelegramWebhookUpdate>;
export type ReceiveTelegramWebhookMutationError = ErrorType<ErrorResponse>;
/**
* @summary Receive Telegram Bot API updates
*/
export declare const useReceiveTelegramWebhook: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof receiveTelegramWebhook>>, TError, {
        data: BodyType<TelegramWebhookUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof receiveTelegramWebhook>>, TError, {
    data: BodyType<TelegramWebhookUpdate>;
}, TContext>;
export declare const getGetMeUrl: () => string;
/**
 * @summary Get the authenticated RM Coin account
 */
export declare const getMe: (options?: Parameters<typeof customFetch>[1]) => Promise<UserProfile>;
export declare const getGetMeQueryKey: () => readonly ["/api/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get the authenticated RM Coin account
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMinerUrl: () => string;
/**
 * @summary Get server-calculated miner state
 */
export declare const getMiner: (options?: Parameters<typeof customFetch>[1]) => Promise<MinerState>;
export declare const getGetMinerQueryKey: () => readonly ["/api/miner"];
export declare const getGetMinerQueryOptions: <TData = Awaited<ReturnType<typeof getMiner>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMiner>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMiner>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMinerQueryResult = NonNullable<Awaited<ReturnType<typeof getMiner>>>;
export type GetMinerQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get server-calculated miner state
 */
export declare function useGetMiner<TData = Awaited<ReturnType<typeof getMiner>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMiner>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getClaimMiningUrl: () => string;
/**
 * @summary Atomically extract unclaimed RM Coin
 */
export declare const claimMining: (options?: Parameters<typeof customFetch>[1]) => Promise<ClaimResult>;
export declare const getClaimMiningMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof claimMining>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof claimMining>>, TError, void, TContext>;
export type ClaimMiningMutationResult = NonNullable<Awaited<ReturnType<typeof claimMining>>>;
export type ClaimMiningMutationError = ErrorType<ErrorResponse>;
/**
* @summary Atomically extract unclaimed RM Coin
*/
export declare const useClaimMining: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof claimMining>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof claimMining>>, TError, void, TContext>;
export declare const getUpgradeMinerUrl: () => string;
/**
 * @summary Upgrade to the next miner level
 */
export declare const upgradeMiner: (minerUpgradeInput: MinerUpgradeInput, options?: Parameters<typeof customFetch>[1]) => Promise<UpgradeResult>;
export declare const getUpgradeMinerMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upgradeMiner>>, TError, {
        data: BodyType<MinerUpgradeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof upgradeMiner>>, TError, {
    data: BodyType<MinerUpgradeInput>;
}, TContext>;
export type UpgradeMinerMutationResult = NonNullable<Awaited<ReturnType<typeof upgradeMiner>>>;
export type UpgradeMinerMutationBody = BodyType<MinerUpgradeInput>;
export type UpgradeMinerMutationError = ErrorType<ErrorResponse>;
/**
* @summary Upgrade to the next miner level
*/
export declare const useUpgradeMiner: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upgradeMiner>>, TError, {
        data: BodyType<MinerUpgradeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof upgradeMiner>>, TError, {
    data: BodyType<MinerUpgradeInput>;
}, TContext>;
export declare const getCreateAdRewardIntentUrl: () => string;
/**
 * @summary Create a one-time Monetag reward intent
 */
export declare const createAdRewardIntent: (options?: Parameters<typeof customFetch>[1]) => Promise<AdRewardIntent>;
export declare const getCreateAdRewardIntentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAdRewardIntent>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAdRewardIntent>>, TError, void, TContext>;
export type CreateAdRewardIntentMutationResult = NonNullable<Awaited<ReturnType<typeof createAdRewardIntent>>>;
export type CreateAdRewardIntentMutationError = ErrorType<unknown>;
/**
* @summary Create a one-time Monetag reward intent
*/
export declare const useCreateAdRewardIntent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAdRewardIntent>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAdRewardIntent>>, TError, void, TContext>;
export declare const getCompleteAdRewardUrl: () => string;
/**
 * @summary Complete a Monetag rewarded ad and grant energy
 */
export declare const completeAdReward: (adRewardInput: AdRewardInput, options?: Parameters<typeof customFetch>[1]) => Promise<RewardResult>;
export declare const getCompleteAdRewardMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeAdReward>>, TError, {
        data: BodyType<AdRewardInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeAdReward>>, TError, {
    data: BodyType<AdRewardInput>;
}, TContext>;
export type CompleteAdRewardMutationResult = NonNullable<Awaited<ReturnType<typeof completeAdReward>>>;
export type CompleteAdRewardMutationBody = BodyType<AdRewardInput>;
export type CompleteAdRewardMutationError = ErrorType<ErrorResponse>;
/**
* @summary Complete a Monetag rewarded ad and grant energy
*/
export declare const useCompleteAdReward: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeAdReward>>, TError, {
        data: BodyType<AdRewardInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeAdReward>>, TError, {
    data: BodyType<AdRewardInput>;
}, TContext>;
export declare const getGetActivityUrl: () => string;
/**
 * @summary Get recent mining and reward activity
 */
export declare const getActivity: (options?: Parameters<typeof customFetch>[1]) => Promise<ActivityItem[]>;
export declare const getGetActivityQueryKey: () => readonly ["/api/activity"];
export declare const getGetActivityQueryOptions: <TData = Awaited<ReturnType<typeof getActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getActivity>>>;
export type GetActivityQueryError = ErrorType<unknown>;
/**
 * @summary Get recent mining and reward activity
 */
export declare function useGetActivity<TData = Awaited<ReturnType<typeof getActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSocialUrl: () => string;
/**
 * @summary Get the full social/gameplay aggregate for the authenticated user
 */
export declare const getSocial: (options?: Parameters<typeof customFetch>[1]) => Promise<GetSocial200>;
export declare const getGetSocialQueryKey: () => readonly ["/api/social"];
export declare const getGetSocialQueryOptions: <TData = Awaited<ReturnType<typeof getSocial>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSocial>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSocial>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSocialQueryResult = NonNullable<Awaited<ReturnType<typeof getSocial>>>;
export type GetSocialQueryError = ErrorType<unknown>;
/**
 * @summary Get the full social/gameplay aggregate for the authenticated user
 */
export declare function useGetSocial<TData = Awaited<ReturnType<typeof getSocial>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSocial>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getPostSocialFallbackUrl: () => string;
/**
 * @deprecated
 * @summary Deprecated no-op (state changes use /social/* action endpoints)
 */
export declare const postSocialFallback: (options?: Parameters<typeof customFetch>[1]) => Promise<unknown>;
export declare const getPostSocialFallbackMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postSocialFallback>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof postSocialFallback>>, TError, void, TContext>;
export type PostSocialFallbackMutationResult = NonNullable<Awaited<ReturnType<typeof postSocialFallback>>>;
export type PostSocialFallbackMutationError = ErrorType<void>;
/**
* @deprecated
* @summary Deprecated no-op (state changes use /social/* action endpoints)
*/
export declare const usePostSocialFallback: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postSocialFallback>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof postSocialFallback>>, TError, void, TContext>;
export declare const getRevealTapUrl: () => string;
/**
 * @summary Curtain tap — server spends LP, advances reveal progress
 */
export declare const revealTap: (revealTapBody: RevealTapBody, options?: Parameters<typeof customFetch>[1]) => Promise<RevealTap200>;
export declare const getRevealTapMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revealTap>>, TError, {
        data: BodyType<RevealTapBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof revealTap>>, TError, {
    data: BodyType<RevealTapBody>;
}, TContext>;
export type RevealTapMutationResult = NonNullable<Awaited<ReturnType<typeof revealTap>>>;
export type RevealTapMutationBody = BodyType<RevealTapBody>;
export type RevealTapMutationError = ErrorType<void>;
/**
* @summary Curtain tap — server spends LP, advances reveal progress
*/
export declare const useRevealTap: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revealTap>>, TError, {
        data: BodyType<RevealTapBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof revealTap>>, TError, {
    data: BodyType<RevealTapBody>;
}, TContext>;
export declare const getRevealUnlockUrl: () => string;
/**
 * @summary Instant RM Coin unlock — server validates cost and balance
 */
export declare const revealUnlock: (revealUnlockBody: RevealUnlockBody, options?: Parameters<typeof customFetch>[1]) => Promise<RevealUnlock200>;
export declare const getRevealUnlockMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revealUnlock>>, TError, {
        data: BodyType<RevealUnlockBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof revealUnlock>>, TError, {
    data: BodyType<RevealUnlockBody>;
}, TContext>;
export type RevealUnlockMutationResult = NonNullable<Awaited<ReturnType<typeof revealUnlock>>>;
export type RevealUnlockMutationBody = BodyType<RevealUnlockBody>;
export type RevealUnlockMutationError = ErrorType<void>;
/**
* @summary Instant RM Coin unlock — server validates cost and balance
*/
export declare const useRevealUnlock: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revealUnlock>>, TError, {
        data: BodyType<RevealUnlockBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof revealUnlock>>, TError, {
    data: BodyType<RevealUnlockBody>;
}, TContext>;
export declare const getFollowModelUrl: () => string;
/**
 * @summary Toggle a model follow
 */
export declare const followModel: (followModelBody: FollowModelBody, options?: Parameters<typeof customFetch>[1]) => Promise<FollowModel200>;
export declare const getFollowModelMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof followModel>>, TError, {
        data: BodyType<FollowModelBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof followModel>>, TError, {
    data: BodyType<FollowModelBody>;
}, TContext>;
export type FollowModelMutationResult = NonNullable<Awaited<ReturnType<typeof followModel>>>;
export type FollowModelMutationBody = BodyType<FollowModelBody>;
export type FollowModelMutationError = ErrorType<unknown>;
/**
* @summary Toggle a model follow
*/
export declare const useFollowModel: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof followModel>>, TError, {
        data: BodyType<FollowModelBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof followModel>>, TError, {
    data: BodyType<FollowModelBody>;
}, TContext>;
export declare const getPostInteractionUrl: () => string;
/**
 * @summary Toggle like/save/hot on a post
 */
export declare const postInteraction: (postInteractionBody: PostInteractionBody, options?: Parameters<typeof customFetch>[1]) => Promise<PostInteraction200>;
export declare const getPostInteractionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postInteraction>>, TError, {
        data: BodyType<PostInteractionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof postInteraction>>, TError, {
    data: BodyType<PostInteractionBody>;
}, TContext>;
export type PostInteractionMutationResult = NonNullable<Awaited<ReturnType<typeof postInteraction>>>;
export type PostInteractionMutationBody = BodyType<PostInteractionBody>;
export type PostInteractionMutationError = ErrorType<unknown>;
/**
* @summary Toggle like/save/hot on a post
*/
export declare const usePostInteraction: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postInteraction>>, TError, {
        data: BodyType<PostInteractionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof postInteraction>>, TError, {
    data: BodyType<PostInteractionBody>;
}, TContext>;
export declare const getRecordViewUrl: () => string;
/**
 * @summary Increment a post view count (atomic)
 */
export declare const recordView: (recordViewBody: RecordViewBody, options?: Parameters<typeof customFetch>[1]) => Promise<RecordView200>;
export declare const getRecordViewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof recordView>>, TError, {
        data: BodyType<RecordViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof recordView>>, TError, {
    data: BodyType<RecordViewBody>;
}, TContext>;
export type RecordViewMutationResult = NonNullable<Awaited<ReturnType<typeof recordView>>>;
export type RecordViewMutationBody = BodyType<RecordViewBody>;
export type RecordViewMutationError = ErrorType<unknown>;
/**
* @summary Increment a post view count (atomic)
*/
export declare const useRecordView: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof recordView>>, TError, {
        data: BodyType<RecordViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof recordView>>, TError, {
    data: BodyType<RecordViewBody>;
}, TContext>;
export declare const getFollowStyleUrl: () => string;
/**
 * @summary Toggle a style follow
 */
export declare const followStyle: (followStyleBody: FollowStyleBody, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getFollowStyleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof followStyle>>, TError, {
        data: BodyType<FollowStyleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof followStyle>>, TError, {
    data: BodyType<FollowStyleBody>;
}, TContext>;
export type FollowStyleMutationResult = NonNullable<Awaited<ReturnType<typeof followStyle>>>;
export type FollowStyleMutationBody = BodyType<FollowStyleBody>;
export type FollowStyleMutationError = ErrorType<unknown>;
/**
* @summary Toggle a style follow
*/
export declare const useFollowStyle: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof followStyle>>, TError, {
        data: BodyType<FollowStyleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof followStyle>>, TError, {
    data: BodyType<FollowStyleBody>;
}, TContext>;
export declare const getSetMuteUrl: () => string;
/**
 * @summary Toggle global video mute (non-authoritative metadata)
 */
export declare const setMute: (setMuteBody: SetMuteBody, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getSetMuteMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setMute>>, TError, {
        data: BodyType<SetMuteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setMute>>, TError, {
    data: BodyType<SetMuteBody>;
}, TContext>;
export type SetMuteMutationResult = NonNullable<Awaited<ReturnType<typeof setMute>>>;
export type SetMuteMutationBody = BodyType<SetMuteBody>;
export type SetMuteMutationError = ErrorType<unknown>;
/**
* @summary Toggle global video mute (non-authoritative metadata)
*/
export declare const useSetMute: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setMute>>, TError, {
        data: BodyType<SetMuteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setMute>>, TError, {
    data: BodyType<SetMuteBody>;
}, TContext>;
export declare const getWheelSpinUrl: () => string;
/**
 * @summary Prize-wheel spin — SERVER picks the prize, validates spin availability
 */
export declare const wheelSpin: (options?: Parameters<typeof customFetch>[1]) => Promise<WheelSpin200>;
export declare const getWheelSpinMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof wheelSpin>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof wheelSpin>>, TError, void, TContext>;
export type WheelSpinMutationResult = NonNullable<Awaited<ReturnType<typeof wheelSpin>>>;
export type WheelSpinMutationError = ErrorType<void>;
/**
* @summary Prize-wheel spin — SERVER picks the prize, validates spin availability
*/
export declare const useWheelSpin: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof wheelSpin>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof wheelSpin>>, TError, void, TContext>;
export declare const getAdIntentUrl: () => string;
/**
 * @summary Register a watched ad -> advances the earned-spin counter
 */
export declare const adIntent: (options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getAdIntentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adIntent>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adIntent>>, TError, void, TContext>;
export type AdIntentMutationResult = NonNullable<Awaited<ReturnType<typeof adIntent>>>;
export type AdIntentMutationError = ErrorType<unknown>;
/**
* @summary Register a watched ad -> advances the earned-spin counter
*/
export declare const useAdIntent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adIntent>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adIntent>>, TError, void, TContext>;
export declare const getPurchaseItemUrl: () => string;
/**
 * @summary Buy a miner/skin — server validates cost against catalogue
 */
export declare const purchaseItem: (purchaseItemBody: PurchaseItemBody, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getPurchaseItemMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof purchaseItem>>, TError, {
        data: BodyType<PurchaseItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof purchaseItem>>, TError, {
    data: BodyType<PurchaseItemBody>;
}, TContext>;
export type PurchaseItemMutationResult = NonNullable<Awaited<ReturnType<typeof purchaseItem>>>;
export type PurchaseItemMutationBody = BodyType<PurchaseItemBody>;
export type PurchaseItemMutationError = ErrorType<void>;
/**
* @summary Buy a miner/skin — server validates cost against catalogue
*/
export declare const usePurchaseItem: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof purchaseItem>>, TError, {
        data: BodyType<PurchaseItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof purchaseItem>>, TError, {
    data: BodyType<PurchaseItemBody>;
}, TContext>;
export declare const getEquipItemUrl: () => string;
/**
 * @summary Equip an owned miner/skin
 */
export declare const equipItem: (equipItemBody: EquipItemBody, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getEquipItemMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof equipItem>>, TError, {
        data: BodyType<EquipItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof equipItem>>, TError, {
    data: BodyType<EquipItemBody>;
}, TContext>;
export type EquipItemMutationResult = NonNullable<Awaited<ReturnType<typeof equipItem>>>;
export type EquipItemMutationBody = BodyType<EquipItemBody>;
export type EquipItemMutationError = ErrorType<void>;
/**
* @summary Equip an owned miner/skin
*/
export declare const useEquipItem: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof equipItem>>, TError, {
        data: BodyType<EquipItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof equipItem>>, TError, {
    data: BodyType<EquipItemBody>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map