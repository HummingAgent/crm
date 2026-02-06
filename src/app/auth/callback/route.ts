import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const getEnv = (key: string) => (process.env[key] || '').trim();
const ALLOWED_DOMAIN = 'hummingagent.ai';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const next = '/';

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(`${origin}${next}`);
    
    const supabase = createServerClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch (e) {
                // Server Component context
              }
              response.cookies.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: true,
              });
            });
          },
        },
      }
    );

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data?.user) {
      // Check domain restriction
      const email = data.user.email || '';
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=AccessDenied`);
      }

      return response;
    }
    
    const errorMsg = encodeURIComponent(exchangeError?.message || 'code_exchange_failed');
    return NextResponse.redirect(`${origin}/login?error=${errorMsg}`);
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
