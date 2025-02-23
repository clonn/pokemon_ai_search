import { searchPokemon } from '@/utils/api';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    // 调用工具函数进行搜索
    const response = await searchPokemon(query);

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: ` Search fail: ${error}`
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}