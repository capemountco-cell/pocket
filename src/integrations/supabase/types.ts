// GENERATED FILE — do not hand-edit.
//
// Regenerate from the database after every migration:
//   supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
// The schema's source of truth is supabase/migrations/, not this file and not
// the dashboard.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_broadcasts: {
        Row: {
          body: string
          created_at: string
          id: string
          idempotency_key: string | null
          recipient_count: number
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          recipient_count?: number
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          recipient_count?: number
          subject?: string
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          body: string
          broadcast_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_user_id: string
          subject: string
        }
        Insert: {
          body: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_user_id: string
          subject: string
        }
        Update: {
          body?: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_user_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "admin_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          admin_password_hash: string | null
          boost_custom_cents_per_view: number
          boost_custom_min_cents: number
          boost_downvote_decay: number
          boost_kill_downvotes: number
          boost_kill_refund: boolean
          boost_mode: string
          boost_weight_default: number
          boost_widen_delivery: boolean
          chrnic_password_hash: string | null
          donate_menu_item_enabled: boolean
          donation_bg_desktop_url: string | null
          donation_bg_mobile_url: string | null
          donation_goal_cents: number
          donation_preset_1_cents: number
          donation_preset_2_cents: number
          donations_enabled: boolean
          embed_timeout_ms: number
          first_visit_paywall_enabled: boolean
          foryou_affinity_scale: number | null
          foryou_dwell_bounce_seconds: number | null
          foryou_dwell_bounce_weight: number | null
          foryou_dwell_engaged_seconds: number | null
          foryou_dwell_engaged_weight: number | null
          foryou_dwell_max_seconds: number | null
          foryou_dwell_short_weight: number | null
          foryou_exploration_pct: number | null
          foryou_halflife_days: number | null
          foryou_weight_dislike: number | null
          foryou_weight_like: number | null
          foryou_weight_save: number | null
          foryou_weight_visit: number | null
          gemini_keys: Json
          give_interstitial_enabled: boolean
          id: number
          like_coachmark_enabled: boolean
          moderation_api_health: Json
          notfound_bg_url: string | null
          pin_failed_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          promo_allowlist: string[]
          promo_boost_downvote_decay: number
          promo_boost_kill_downvotes: number
          promo_fail_open: boolean
          promo_flat_penalty: number
          promo_gate_enabled: boolean
          promo_negative_multiplier: number
          promo_signal_groups: Json
          promo_signal_threshold: number
          public_feed_limit: number
          rot_hide_dislike_min: number
          rot_hide_dislike_ratio: number
          rot_like_boost_divisor: number
          splash_enabled: boolean
          submission_mode: string
          updated_at: string
        }
        Insert: {
          admin_password_hash?: string | null
          boost_custom_cents_per_view?: number
          boost_custom_min_cents?: number
          boost_downvote_decay?: number
          boost_kill_downvotes?: number
          boost_kill_refund?: boolean
          boost_mode?: string
          boost_weight_default?: number
          boost_widen_delivery?: boolean
          chrnic_password_hash?: string | null
          donate_menu_item_enabled?: boolean
          donation_bg_desktop_url?: string | null
          donation_bg_mobile_url?: string | null
          donation_goal_cents?: number
          donation_preset_1_cents?: number
          donation_preset_2_cents?: number
          donations_enabled?: boolean
          embed_timeout_ms?: number
          first_visit_paywall_enabled?: boolean
          foryou_affinity_scale?: number | null
          foryou_dwell_bounce_seconds?: number | null
          foryou_dwell_bounce_weight?: number | null
          foryou_dwell_engaged_seconds?: number | null
          foryou_dwell_engaged_weight?: number | null
          foryou_dwell_max_seconds?: number | null
          foryou_dwell_short_weight?: number | null
          foryou_exploration_pct?: number | null
          foryou_halflife_days?: number | null
          foryou_weight_dislike?: number | null
          foryou_weight_like?: number | null
          foryou_weight_save?: number | null
          foryou_weight_visit?: number | null
          gemini_keys?: Json
          give_interstitial_enabled?: boolean
          id?: number
          like_coachmark_enabled?: boolean
          moderation_api_health?: Json
          notfound_bg_url?: string | null
          pin_failed_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          promo_allowlist?: string[]
          promo_boost_downvote_decay?: number
          promo_boost_kill_downvotes?: number
          promo_fail_open?: boolean
          promo_flat_penalty?: number
          promo_gate_enabled?: boolean
          promo_negative_multiplier?: number
          promo_signal_groups?: Json
          promo_signal_threshold?: number
          public_feed_limit?: number
          rot_hide_dislike_min?: number
          rot_hide_dislike_ratio?: number
          rot_like_boost_divisor?: number
          splash_enabled?: boolean
          submission_mode?: string
          updated_at?: string
        }
        Update: {
          admin_password_hash?: string | null
          boost_custom_cents_per_view?: number
          boost_custom_min_cents?: number
          boost_downvote_decay?: number
          boost_kill_downvotes?: number
          boost_kill_refund?: boolean
          boost_mode?: string
          boost_weight_default?: number
          boost_widen_delivery?: boolean
          chrnic_password_hash?: string | null
          donate_menu_item_enabled?: boolean
          donation_bg_desktop_url?: string | null
          donation_bg_mobile_url?: string | null
          donation_goal_cents?: number
          donation_preset_1_cents?: number
          donation_preset_2_cents?: number
          donations_enabled?: boolean
          embed_timeout_ms?: number
          first_visit_paywall_enabled?: boolean
          foryou_affinity_scale?: number | null
          foryou_dwell_bounce_seconds?: number | null
          foryou_dwell_bounce_weight?: number | null
          foryou_dwell_engaged_seconds?: number | null
          foryou_dwell_engaged_weight?: number | null
          foryou_dwell_max_seconds?: number | null
          foryou_dwell_short_weight?: number | null
          foryou_exploration_pct?: number | null
          foryou_halflife_days?: number | null
          foryou_weight_dislike?: number | null
          foryou_weight_like?: number | null
          foryou_weight_save?: number | null
          foryou_weight_visit?: number | null
          gemini_keys?: Json
          give_interstitial_enabled?: boolean
          id?: number
          like_coachmark_enabled?: boolean
          moderation_api_health?: Json
          notfound_bg_url?: string | null
          pin_failed_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          promo_allowlist?: string[]
          promo_boost_downvote_decay?: number
          promo_boost_kill_downvotes?: number
          promo_fail_open?: boolean
          promo_flat_penalty?: number
          promo_gate_enabled?: boolean
          promo_negative_multiplier?: number
          promo_signal_groups?: Json
          promo_signal_threshold?: number
          public_feed_limit?: number
          rot_hide_dislike_min?: number
          rot_hide_dislike_ratio?: number
          rot_like_boost_divisor?: number
          splash_enabled?: boolean
          submission_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      banned_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: []
      }
      billing_config: {
        Row: {
          id: number
          pro_monthly_price_id: string | null
          pro_weekly_price_id: string | null
          pro_yearly_price_id: string | null
          stripe_mode: string | null
          updated_at: string
          webhook_endpoint_id: string | null
          webhook_secret: string | null
          webhook_updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          id?: number
          pro_monthly_price_id?: string | null
          pro_weekly_price_id?: string | null
          pro_yearly_price_id?: string | null
          stripe_mode?: string | null
          updated_at?: string
          webhook_endpoint_id?: string | null
          webhook_secret?: string | null
          webhook_updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          id?: number
          pro_monthly_price_id?: string | null
          pro_weekly_price_id?: string | null
          pro_yearly_price_id?: string | null
          stripe_mode?: string | null
          updated_at?: string
          webhook_endpoint_id?: string | null
          webhook_secret?: string | null
          webhook_updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      blocked_sites: {
        Row: {
          created_at: string
          device_id: string
          site_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          site_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          private_until: string | null
          publish_at: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          private_until?: string | null
          publish_at?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          private_until?: string | null
          publish_at?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_orders: {
        Row: {
          amount_cents: number
          buyer_name: string | null
          buyer_user_id: string | null
          created_at: string
          customer_email: string | null
          device_id: string | null
          downvote_count: number
          expires_at: string | null
          id: string
          impressions_delivered: number
          impressions_purchased: number
          killed_at: string | null
          reboost_of: string | null
          site_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          stripe_session_id: string | null
          tier_name: string | null
          url: string
        }
        Insert: {
          amount_cents: number
          buyer_name?: string | null
          buyer_user_id?: string | null
          created_at?: string
          customer_email?: string | null
          device_id?: string | null
          downvote_count?: number
          expires_at?: string | null
          id?: string
          impressions_delivered?: number
          impressions_purchased: number
          killed_at?: string | null
          reboost_of?: string | null
          site_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_session_id?: string | null
          tier_name?: string | null
          url: string
        }
        Update: {
          amount_cents?: number
          buyer_name?: string | null
          buyer_user_id?: string | null
          created_at?: string
          customer_email?: string | null
          device_id?: string | null
          downvote_count?: number
          expires_at?: string | null
          id?: string
          impressions_delivered?: number
          impressions_purchased?: number
          killed_at?: string | null
          reboost_of?: string | null
          site_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_session_id?: string | null
          tier_name?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_tiers: {
        Row: {
          active: boolean
          created_at: string
          duration_days: number
          id: string
          impressions: number
          name: string
          price_cents: number
          sort: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_days?: number
          id?: string
          impressions: number
          name: string
          price_cents: number
          sort?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_days?: number
          id?: string
          impressions?: number
          name?: string
          price_cents?: number
          sort?: number
        }
        Relationships: []
      }
      campaign_updates_subscribers: {
        Row: {
          consent_version: string
          created_at: string
          email_hash: string
          id: string
          source: string | null
        }
        Insert: {
          consent_version: string
          created_at?: string
          email_hash: string
          id?: string
          source?: string | null
        }
        Update: {
          consent_version?: string
          created_at?: string
          email_hash?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      checkout_attempts: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          ip: string | null
          kind: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          ip?: string | null
          kind?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          ip?: string | null
          kind?: string
        }
        Relationships: []
      }
      chrnic_sessions: {
        Row: {
          created_at: string
          expires_at: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          message: string | null
          status: string
          stripe_session_id: string | null
          username: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          message?: string | null
          status?: string
          stripe_session_id?: string | null
          username?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          message?: string | null
          status?: string
          stripe_session_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          kind: string
          site_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          kind: string
          site_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          kind?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          device_id: string | null
          email: string | null
          id: string
          kind: string
          message: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          email?: string | null
          id?: string
          kind: string
          message: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          email?: string | null
          id?: string
          kind?: string
          message?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          action: string
          created_at: string
          device_id: string
          id: string
          site_id: string
        }
        Insert: {
          action: string
          created_at?: string
          device_id: string
          id?: string
          site_id: string
        }
        Update: {
          action?: string
          created_at?: string
          device_id?: string
          id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      paywall_variants: {
        Row: {
          background_image_url: string | null
          benefits: Json
          created_at: string
          enabled: boolean
          headline: string
          id: string
          key: string
          name: string
          plans: Json
          sort: number
          subhead: string
          trial_days: number
          updated_at: string
          weight: number
        }
        Insert: {
          background_image_url?: string | null
          benefits?: Json
          created_at?: string
          enabled?: boolean
          headline?: string
          id?: string
          key: string
          name: string
          plans?: Json
          sort?: number
          subhead?: string
          trial_days?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          background_image_url?: string | null
          benefits?: Json
          created_at?: string
          enabled?: boolean
          headline?: string
          id?: string
          key?: string
          name?: string
          plans?: Json
          sort?: number
          subhead?: string
          trial_days?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      pending_notifications: {
        Row: {
          body: string | null
          created_at: string
          device_id: string | null
          id: string
          kind: string
          order_id: string | null
          sent: boolean
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          kind: string
          order_id?: string | null
          sent?: boolean
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          kind?: string
          order_id?: string | null
          sent?: boolean
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      petition_rate_events: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      petition_signatures: {
        Row: {
          consent_version: string
          created_at: string
          email_hash: string
          id: string
          letter_version: string
          name_hidden: boolean
          public_name: string | null
          source: string | null
          status: string
          token_expires_at: string | null
          token_hash: string | null
          verified_at: string | null
        }
        Insert: {
          consent_version: string
          created_at?: string
          email_hash: string
          id?: string
          letter_version: string
          name_hidden?: boolean
          public_name?: string | null
          source?: string | null
          status?: string
          token_expires_at?: string | null
          token_hash?: string | null
          verified_at?: string | null
        }
        Update: {
          consent_version?: string
          created_at?: string
          email_hash?: string
          id?: string
          letter_version?: string
          name_hidden?: boolean
          public_name?: string | null
          source?: string | null
          status?: string
          token_expires_at?: string | null
          token_hash?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      profile_links: {
        Row: {
          created_at: string
          id: string
          label: string
          owner_id: string
          sort: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          owner_id: string
          sort?: number
          url?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
          sort?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_links_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_variant: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_period_end: string | null
          display_name: string | null
          email: string | null
          id: string
          is_pro: boolean
          linked_device_id: string | null
          pin: string | null
          plan: string | null
          pro_since: string | null
          signup_method: string | null
          stripe_customer_id: string | null
          sub_status: string | null
          theme: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          assigned_variant?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_pro?: boolean
          linked_device_id?: string | null
          pin?: string | null
          plan?: string | null
          pro_since?: string | null
          signup_method?: string | null
          stripe_customer_id?: string | null
          sub_status?: string | null
          theme?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          assigned_variant?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_pro?: boolean
          linked_device_id?: string | null
          pin?: string | null
          plan?: string | null
          pro_since?: string | null
          signup_method?: string | null
          stripe_customer_id?: string | null
          sub_status?: string | null
          theme?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      saved_sites: {
        Row: {
          created_at: string
          device_id: string
          id: string
          site_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          site_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      seen_sites: {
        Row: {
          created_at: string
          device_id: string
          site_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          site_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seen_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }
        Insert: {
          boosted?: boolean
          category?: string | null
          category_confidence?: number | null
          created_at?: string
          description?: string | null
          dislike_count?: number
          embed_block_reason?: string | null
          embed_checked_at?: string | null
          embeddable?: boolean | null
          favicon_url?: string | null
          final_url?: string | null
          id?: string
          is_adult?: boolean
          is_promotional?: boolean
          like_count?: number
          mood?: Json
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          promo_detected_at?: string | null
          promo_group?: string | null
          promo_signals?: string[]
          review_flags?: string | null
          secondary_categories?: string[]
          spam_report_count?: number
          status?: string
          submitted_by_device?: string | null
          tags?: string[]
          title: string
          url: string
        }
        Update: {
          boosted?: boolean
          category?: string | null
          category_confidence?: number | null
          created_at?: string
          description?: string | null
          dislike_count?: number
          embed_block_reason?: string | null
          embed_checked_at?: string | null
          embeddable?: boolean | null
          favicon_url?: string | null
          final_url?: string | null
          id?: string
          is_adult?: boolean
          is_promotional?: boolean
          like_count?: number
          mood?: Json
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          promo_detected_at?: string | null
          promo_group?: string | null
          promo_signals?: string[]
          review_flags?: string | null
          secondary_categories?: string[]
          spam_report_count?: number
          status?: string
          submitted_by_device?: string | null
          tags?: string[]
          title?: string
          url?: string
        }
        Relationships: []
      }
      spam_reports: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          site_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          site_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spam_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          author: string | null
          boosted: boolean
          category: string | null
          classification_reason: string | null
          created_at: string
          destination:
            | Database["public"]["Enums"]["submission_destination"]
            | null
          device_id: string | null
          dominant_color: string | null
          feed_url: string | null
          id: string
          is_embeddable: boolean | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          reason: string | null
          submitted_by: string | null
          title: string | null
          url: string
          verdict: string | null
        }
        Insert: {
          author?: string | null
          boosted?: boolean
          category?: string | null
          classification_reason?: string | null
          created_at?: string
          destination?:
            | Database["public"]["Enums"]["submission_destination"]
            | null
          device_id?: string | null
          dominant_color?: string | null
          feed_url?: string | null
          id?: string
          is_embeddable?: boolean | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          reason?: string | null
          submitted_by?: string | null
          title?: string | null
          url: string
          verdict?: string | null
        }
        Update: {
          author?: string | null
          boosted?: boolean
          category?: string | null
          classification_reason?: string | null
          created_at?: string
          destination?:
            | Database["public"]["Enums"]["submission_destination"]
            | null
          device_id?: string | null
          dominant_color?: string | null
          feed_url?: string | null
          id?: string
          is_embeddable?: boolean | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          reason?: string | null
          submitted_by?: string | null
          title?: string | null
          url?: string
          verdict?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tm_campaign_config: {
        Row: {
          consent_version: string
          donation_source: string
          evidence_cards_visible: boolean
          fund_purpose: string
          id: number
          letter_version: string
          public_list_enabled: boolean
          published: boolean
          receiving_entity: string
          redacted_correspondence_visible: boolean
          tax_status: string
          unused_funds_policy: string
          updated_at: string
        }
        Insert: {
          consent_version?: string
          donation_source?: string
          evidence_cards_visible?: boolean
          fund_purpose?: string
          id: number
          letter_version?: string
          public_list_enabled?: boolean
          published?: boolean
          receiving_entity?: string
          redacted_correspondence_visible?: boolean
          tax_status?: string
          unused_funds_policy?: string
          updated_at?: string
        }
        Update: {
          consent_version?: string
          donation_source?: string
          evidence_cards_visible?: boolean
          fund_purpose?: string
          id?: number
          letter_version?: string
          public_list_enabled?: boolean
          published?: boolean
          receiving_entity?: string
          redacted_correspondence_visible?: boolean
          tax_status?: string
          unused_funds_policy?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_category_affinity: {
        Row: {
          category: string
          device_id: string
          score: number
          updated_at: string
        }
        Insert: {
          category: string
          device_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          category?: string
          device_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_mood_affinity: {
        Row: {
          axis: string
          device_id: string
          pref: number
          updated_at: string
          weight: number
        }
        Insert: {
          axis: string
          device_id: string
          pref?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          axis?: string
          device_id?: string
          pref?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      whats_new_posts: {
        Row: {
          body_html: string
          created_at: string
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      whats_new_reactions: {
        Row: {
          created_at: string
          device_id: string
          emoji: string
          post_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          emoji: string
          post_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          emoji?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whats_new_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "whats_new_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_banned: {
        Args: { p_domain: string; p_token: string }
        Returns: boolean
      }
      admin_add_donation: {
        Args: {
          p_amount_cents: number
          p_created_at: string
          p_message: string
          p_name: string
          p_token: string
        }
        Returns: undefined
      }
      admin_apply_recategorization: {
        Args: { p_token: string; p_updates: Json }
        Returns: Json
      }
      admin_approve_submission: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      admin_boost_dashboard: { Args: { p_token: string }; Returns: Json }
      admin_category_overview: { Args: { p_token: string }; Returns: Json }
      admin_delete_boost_tier: {
        Args: { p_id: string; p_token: string }
        Returns: undefined
      }
      admin_delete_paywall_variant: {
        Args: { p_id: string; p_token: string }
        Returns: undefined
      }
      admin_delete_site: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      admin_delete_whats_new: {
        Args: { p_id: string; p_token: string }
        Returns: undefined
      }
      admin_duplicate_paywall_variant: {
        Args: { p_id: string; p_new_key: string; p_token: string }
        Returns: string
      }
      admin_engagement_report: {
        Args: { p_limit?: number; p_token: string }
        Returns: Json
      }
      admin_export_sites: { Args: { p_token: string }; Returns: Json }
      admin_feature_usage: { Args: { p_token: string }; Returns: Json }
      admin_foryou_overview: { Args: { p_token: string }; Returns: Json }
      admin_get_account_stats: { Args: { p_token: string }; Returns: Json }
      admin_get_billing_config: { Args: { p_token: string }; Returns: Json }
      admin_get_boost_settings: { Args: { p_token: string }; Returns: Json }
      admin_get_engagement_config: { Args: { p_token: string }; Returns: Json }
      admin_get_foryou_config: { Args: { p_token: string }; Returns: Json }
      admin_get_moderation: { Args: { p_token: string }; Returns: Json }
      admin_get_profile_billing: {
        Args: { p_email: string; p_token: string }
        Returns: Json
      }
      admin_get_promo_config: { Args: { p_token: string }; Returns: Json }
      admin_get_rotation_config: { Args: { p_token: string }; Returns: Json }
      admin_get_settings: { Args: { p_token: string }; Returns: Json }
      admin_get_stats: { Args: { p_token: string }; Returns: Json }
      admin_get_tm_campaign: {
        Args: { p_token: string }
        Returns: {
          consent_version: string
          donation_source: string
          evidence_cards_visible: boolean
          fund_purpose: string
          id: number
          letter_version: string
          public_list_enabled: boolean
          published: boolean
          receiving_entity: string
          redacted_correspondence_visible: boolean
          tax_status: string
          unused_funds_policy: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tm_campaign_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_import_sites: {
        Args: { p_rows: Json; p_token: string }
        Returns: Json
      }
      admin_list_banned: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          domain: string
          id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "banned_domains"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_donations: {
        Args: { p_limit?: number; p_token: string }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          message: string | null
          status: string
          stripe_session_id: string | null
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_feedback: { Args: { p_token: string }; Returns: Json }
      admin_list_paywall_variants: { Args: { p_token: string }; Returns: Json }
      admin_list_pending_submissions: {
        Args: { p_limit?: number; p_token: string }
        Returns: {
          author: string | null
          boosted: boolean
          category: string | null
          classification_reason: string | null
          created_at: string
          destination:
            | Database["public"]["Enums"]["submission_destination"]
            | null
          device_id: string | null
          dominant_color: string | null
          feed_url: string | null
          id: string
          is_embeddable: boolean | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          reason: string | null
          submitted_by: string | null
          title: string | null
          url: string
          verdict: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "submissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_petition_signatures: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_token: string
        }
        Returns: {
          created_at: string
          id: string
          letter_version: string
          name_hidden: boolean
          public_name: string
          source: string
          status: string
          verified_at: string
        }[]
      }
      admin_list_sites: {
        Args: { p_search?: string; p_status?: string; p_token: string }
        Returns: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_spam_sites: {
        Args: { p_token: string }
        Returns: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_submissions: {
        Args: { p_limit?: number; p_token: string }
        Returns: {
          author: string | null
          boosted: boolean
          category: string | null
          classification_reason: string | null
          created_at: string
          destination:
            | Database["public"]["Enums"]["submission_destination"]
            | null
          device_id: string | null
          dominant_color: string | null
          feed_url: string | null
          id: string
          is_embeddable: boolean | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          reason: string | null
          submitted_by: string | null
          title: string | null
          url: string
          verdict: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "submissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_whats_new: { Args: { p_token: string }; Returns: Json }
      admin_mark_boost_refunded: {
        Args: { p_order_id: string; p_token: string }
        Returns: undefined
      }
      admin_password_exists: { Args: never; Returns: boolean }
      admin_paywall_results: {
        Args: { p_since: string; p_token: string }
        Returns: Json
      }
      admin_petition_stats: {
        Args: { p_token: string }
        Returns: {
          pending: number
          rejected: number
          verified: number
        }[]
      }
      admin_pin_exists: { Args: never; Returns: boolean }
      admin_purge_orphaned_data: { Args: { p_token: string }; Returns: Json }
      admin_recalculate_stats: { Args: { p_token: string }; Returns: Json }
      admin_recategorize_candidates: {
        Args: { p_limit?: number; p_only_other?: boolean; p_token: string }
        Returns: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_reject_submission: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      admin_remove_banned: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      admin_set_donate_menu_item_enabled: {
        Args: { p_enabled: boolean; p_token: string }
        Returns: boolean
      }
      admin_set_donation_bg: {
        Args: { p_token: string; p_url: string; p_variant: string }
        Returns: undefined
      }
      admin_set_embed_timeout: {
        Args: { p_ms: number; p_token: string }
        Returns: boolean
      }
      admin_set_give_interstitial: {
        Args: { p_enabled: boolean; p_token: string }
        Returns: boolean
      }
      admin_set_petition_name_hidden: {
        Args: { p_hidden: boolean; p_id: string; p_token: string }
        Returns: boolean
      }
      admin_set_petition_status: {
        Args: { p_id: string; p_status: string; p_token: string }
        Returns: boolean
      }
      admin_set_pro: {
        Args: {
          p_device_id?: string
          p_email: string
          p_is_pro: boolean
          p_token: string
        }
        Returns: Json
      }
      admin_set_site_status: {
        Args: { p_id: string; p_status: string; p_token: string }
        Returns: undefined
      }
      admin_set_submission_mode: {
        Args: { p_mode: string; p_token: string }
        Returns: boolean
      }
      admin_site_counts: { Args: { p_token: string }; Returns: Json }
      admin_unenriched_count: { Args: { p_token: string }; Returns: number }
      admin_untagged_count: { Args: { p_token: string }; Returns: number }
      admin_update_boost_settings: {
        Args: { p_config: Json; p_token: string }
        Returns: undefined
      }
      admin_update_donation_config: {
        Args: {
          p_enabled: boolean
          p_goal_cents: number
          p_preset_1_cents: number
          p_preset_2_cents: number
          p_token: string
        }
        Returns: boolean
      }
      admin_update_engagement_config: {
        Args: {
          p_boost_downvote_decay: number
          p_boost_kill_downvotes: number
          p_boost_kill_refund: boolean
          p_promo_boost_downvote_decay: number
          p_promo_boost_kill_downvotes: number
          p_promo_flat_penalty: number
          p_promo_negative_multiplier: number
          p_token: string
        }
        Returns: boolean
      }
      admin_update_foryou_config: {
        Args: { p_config: Json; p_token: string }
        Returns: undefined
      }
      admin_update_promo_config: {
        Args: {
          p_allowlist: string[]
          p_enabled: boolean
          p_fail_open: boolean
          p_groups: Json
          p_threshold: number
          p_token: string
        }
        Returns: boolean
      }
      admin_update_rotation_config: {
        Args: {
          p_hide_min: number
          p_hide_ratio: number
          p_like_boost: number
          p_token: string
        }
        Returns: boolean
      }
      admin_update_settings: {
        Args: { p_feed_limit: number; p_gemini_keys: Json; p_token: string }
        Returns: boolean
      }
      admin_update_tm_campaign: {
        Args: {
          p_consent_version: string
          p_donation_source: string
          p_evidence_cards_visible: boolean
          p_fund_purpose: string
          p_letter_version: string
          p_public_list_enabled: boolean
          p_published: boolean
          p_receiving_entity: string
          p_redacted_correspondence_visible: boolean
          p_tax_status: string
          p_token: string
          p_unused_funds_policy: string
        }
        Returns: boolean
      }
      admin_upsert_boost_tier: {
        Args: {
          p_active: boolean
          p_duration_days: number
          p_id: string
          p_impressions: number
          p_name: string
          p_price_cents: number
          p_sort: number
          p_token: string
        }
        Returns: undefined
      }
      admin_upsert_paywall_variant: {
        Args: {
          p_background_image_url: string
          p_benefits: Json
          p_enabled: boolean
          p_headline: string
          p_id: string
          p_key: string
          p_name: string
          p_plans: Json
          p_sort: number
          p_subhead: string
          p_token: string
          p_trial_days: number
          p_weight: number
        }
        Returns: string
      }
      admin_upsert_site: {
        Args: {
          p_category: string
          p_description: string
          p_id: string
          p_is_adult: boolean
          p_og_image: string
          p_status: string
          p_title: string
          p_token: string
          p_url: string
        }
        Returns: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_whats_new: {
        Args: {
          p_body_html: string
          p_id: string
          p_published: boolean
          p_title: string
          p_token: string
        }
        Returns: string
      }
      apply_affinity: {
        Args: { p_category: string; p_device_id: string; p_weight: number }
        Returns: undefined
      }
      apply_affinity_for_site: {
        Args: { p_device_id: string; p_site_id: string; p_weight: number }
        Returns: undefined
      }
      apply_boost_downvote: { Args: { p_site_id: string }; Returns: undefined }
      apply_mood_learning: {
        Args: { p_device_id: string; p_site_id: string; p_strength?: number }
        Returns: undefined
      }
      apply_subscription_state: {
        Args: {
          p_current_period_end: string
          p_device_id?: string
          p_is_pro: boolean
          p_plan: string
          p_stripe_customer_id: string
          p_sub_status: string
          p_user_id: string
        }
        Returns: Json
      }
      change_admin_password: {
        Args: { p_new_password: string; p_token: string }
        Returns: boolean
      }
      change_admin_pin: {
        Args: { p_new_pin: string; p_token: string }
        Returns: boolean
      }
      chrnic_broadcast_message: {
        Args: {
          p_body: string
          p_idempotency_key: string
          p_subject: string
          p_token: string
        }
        Returns: Json
      }
      chrnic_disable_boost: {
        Args: { p_order_id: string; p_token: string }
        Returns: Json
      }
      chrnic_get_account_stats: { Args: { p_token: string }; Returns: Json }
      chrnic_get_boost_dashboard: { Args: { p_token: string }; Returns: Json }
      chrnic_get_boost_leaderboard: { Args: { p_token: string }; Returns: Json }
      chrnic_get_booster_recipient_count: {
        Args: { p_token: string }
        Returns: number
      }
      chrnic_get_sent_log: { Args: { p_token: string }; Returns: Json }
      chrnic_logout: { Args: { p_token: string }; Returns: undefined }
      chrnic_password_exists: { Args: never; Returns: boolean }
      chrnic_record_reboost: {
        Args: {
          p_amount_cents: number
          p_impressions: number
          p_payment_intent_id: string
          p_source_order_id: string
          p_token: string
        }
        Returns: Json
      }
      chrnic_send_message: {
        Args: {
          p_body: string
          p_recipient_user_id: string
          p_subject: string
          p_token: string
        }
        Returns: Json
      }
      clear_saved_sites: { Args: { p_device_id: string }; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_my_profile: {
        Args: { p_method?: string }
        Returns: {
          assigned_variant: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_period_end: string | null
          display_name: string | null
          email: string | null
          id: string
          is_pro: boolean
          linked_device_id: string | null
          pin: string | null
          plan: string | null
          pro_since: string | null
          signup_method: string | null
          stripe_customer_id: string | null
          sub_status: string | null
          theme: string | null
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_profile_for_user: {
        Args: { p_email: string; p_signup_method: string; p_user_id: string }
        Returns: undefined
      }
      find_user_by_stripe_customer: {
        Args: { p_customer_id: string }
        Returns: string
      }
      gen_profile_pin: { Args: never; Returns: string }
      get_active_paywall_variants: { Args: never; Returns: Json }
      get_auth_user_status: {
        Args: { p_email: string }
        Returns: {
          email_confirmed: boolean
          has_signed_in: boolean
          user_id: string
        }[]
      }
      get_billing_price_ids: { Args: never; Returns: Json }
      get_billing_webhook_secret: { Args: never; Returns: string }
      get_boost_config: { Args: never; Returns: Json }
      get_discovery_queue: {
        Args: {
          p_device_id: string
          p_exclude_ids?: string[]
          p_limit?: number
        }
        Returns: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_donation_state: { Args: never; Returns: Json }
      get_mood_seed: { Args: { p_device_id: string }; Returns: Json }
      get_my_admin_messages: { Args: never; Returns: Json }
      get_my_interactions: {
        Args: { p_device_id: string }
        Returns: {
          action: string
          site_id: string
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          assigned_variant: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_period_end: string | null
          display_name: string | null
          email: string | null
          id: string
          is_pro: boolean
          linked_device_id: string | null
          pin: string | null
          plan: string | null
          pro_since: string | null
          signup_method: string | null
          stripe_customer_id: string | null
          sub_status: string | null
          theme: string | null
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_saved_ids: {
        Args: { p_device_id: string }
        Returns: {
          site_id: string
        }[]
      }
      get_my_saved_sites: {
        Args: { p_device_id: string; p_from: number; p_limit: number }
        Returns: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_submissions: { Args: { p_device_id: string }; Returns: Json }
      get_paywall_variant_by_key: { Args: { p_key: string }; Returns: Json }
      get_public_config: { Args: never; Returns: Json }
      get_public_profile: { Args: { p_slug: string }; Returns: Json }
      get_stumble_debug_stats: {
        Args: {
          p_device_id: string
          p_organic_only?: boolean
          p_tags?: string[]
        }
        Returns: Json
      }
      get_stumble_queue: {
        Args: {
          p_device_id: string
          p_exclude_ids?: string[]
          p_limit?: number
          p_mood_target?: Json
          p_organic_only?: boolean
          p_personalized: boolean
          p_tags?: string[]
        }
        Returns: {
          boosted: boolean
          category: string | null
          category_confidence: number | null
          created_at: string
          description: string | null
          dislike_count: number
          embed_block_reason: string | null
          embed_checked_at: string | null
          embeddable: boolean | null
          favicon_url: string | null
          final_url: string | null
          id: string
          is_adult: boolean
          is_promotional: boolean
          like_count: number
          mood: Json
          og_description: string | null
          og_image: string | null
          og_title: string | null
          promo_detected_at: string | null
          promo_group: string | null
          promo_signals: string[]
          review_flags: string | null
          secondary_categories: string[]
          spam_report_count: number
          status: string
          submitted_by_device: string | null
          tags: string[]
          title: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_tag_filters: { Args: never; Returns: Json }
      get_tm_campaign_config: {
        Args: never
        Returns: {
          consent_version: string
          donation_source: string
          evidence_cards_visible: boolean
          fund_purpose: string
          id: number
          letter_version: string
          public_list_enabled: boolean
          published: boolean
          receiving_entity: string
          redacted_correspondence_visible: boolean
          tax_status: string
          unused_funds_policy: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tm_campaign_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_trending_submissions: {
        Args: { p_limit?: number }
        Returns: {
          boosted: boolean
          created_at: string
          destination: Database["public"]["Enums"]["submission_destination"]
          dominant_color: string
          id: string
          title: string
          url: string
        }[]
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_whats_new: { Args: { p_device_id: string }; Returns: Json }
      is_admin_token_valid: { Args: { p_token: string }; Returns: boolean }
      is_chrnic_token_valid: { Args: { p_token: string }; Returns: boolean }
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean }
      mark_admin_message_read: { Args: { p_id: string }; Returns: undefined }
      merge_device_bookmarks_to_user: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      petition_public_count: { Args: never; Returns: number }
      petition_public_list: {
        Args: { p_limit?: number }
        Returns: {
          public_name: string
          signed_at: string
        }[]
      }
      promote_due_blog_posts: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_boost_event: {
        Args: { p_device_id: string; p_kind: string; p_tier: string }
        Returns: undefined
      }
      record_discovery: {
        Args: { p_device_id: string; p_site_id: string }
        Returns: undefined
      }
      record_downvote: {
        Args: { p_device_id: string; p_kind: string; p_site_id: string }
        Returns: undefined
      }
      record_dwell: {
        Args: {
          p_device_id: string
          p_dwell_seconds: number
          p_site_id: string
        }
        Returns: undefined
      }
      record_embed_block: {
        Args: { p_device_id: string; p_site_id: string }
        Returns: undefined
      }
      record_event: {
        Args: { p_device_id: string; p_kind: string; p_site_id?: string }
        Returns: undefined
      }
      record_interaction: {
        Args: { p_action: string; p_device_id: string; p_site_id: string }
        Returns: {
          dislike_count: number
          like_count: number
          state: string
        }[]
      }
      record_my_reboost: {
        Args: {
          p_amount_cents: number
          p_device_id: string
          p_impressions: number
          p_payment_intent_id: string
          p_source_order_id: string
        }
        Returns: Json
      }
      record_paywall_event: {
        Args: {
          p_device_id: string
          p_interval?: string
          p_kind: string
          p_variant_key: string
        }
        Returns: undefined
      }
      record_stumble: {
        Args: { p_device_id: string; p_site_id: string }
        Returns: undefined
      }
      reset_discovery_history: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      resolve_paywall_plan: {
        Args: { p_interval: string; p_variant_key: string }
        Returns: Json
      }
      set_billing_config: {
        Args: {
          p_mode: string
          p_monthly: string
          p_weekly: string
          p_yearly: string
        }
        Returns: undefined
      }
      set_billing_webhook: {
        Args: { p_endpoint_id: string; p_secret: string; p_url: string }
        Returns: undefined
      }
      set_initial_admin_password: {
        Args: { p_password: string }
        Returns: boolean
      }
      set_initial_admin_pin: { Args: { p_pin: string }; Returns: boolean }
      set_initial_chrnic_password: {
        Args: { p_password: string; p_pin: string }
        Returns: boolean
      }
      set_my_assigned_variant: {
        Args: { p_variant_key: string }
        Returns: undefined
      }
      set_my_username: { Args: { p_username: string }; Returns: Json }
      submit_contact_message: {
        Args: {
          p_email: string
          p_message: string
          p_name: string
          p_owner: string
        }
        Returns: Json
      }
      submit_feedback: {
        Args: {
          p_device_id: string
          p_email: string
          p_kind: string
          p_message: string
        }
        Returns: string
      }
      sync_variant_prices_from_billing_config: {
        Args: never
        Returns: undefined
      }
      toggle_save: {
        Args: { p_device_id: string; p_site_id: string }
        Returns: boolean
      }
      toggle_whats_new_reaction: {
        Args: { p_device_id: string; p_emoji: string; p_post_id: string }
        Returns: undefined
      }
      verify_admin: {
        Args: { p_password: string; p_pin: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      verify_admin_pin: {
        Args: { p_pin: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      verify_chrnic: {
        Args: { p_password: string; p_pin: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
    }
    Enums: {
      moderation_status: "pending" | "approved" | "published" | "rejected"
      submission_destination:
        | "stumble"
        | "boost_only"
        | "reader"
        | "learn"
        | "tv"
        | "none"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      moderation_status: ["pending", "approved", "published", "rejected"],
      submission_destination: [
        "stumble",
        "boost_only",
        "reader",
        "learn",
        "tv",
        "none",
      ],
    },
  },
} as const
