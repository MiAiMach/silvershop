"use server";
import qs from "query-string";
//All data fetching logic here

const BASE_URL = process.env.COIN_GECKO_BASE_URL;
const API_KEY = process.env.COIN_GECKO_API_KEY;

if (!BASE_URL) throw new Error("Could not get base url");
if (!API_KEY) throw new Error("Could not get API Key");

//Fetcher function that fetches all API endpoints

export async function fetcher<T>(
  //function parameters
  endpoint: string,
  params?: QueryParams,
  revalidate = 60
): Promise<T> {
  // need to figure out which URL we're trying to call. We need to construct the URL
  // Constructing https://pro-api.coingecko.com/api/v3 and then appending endpoints and additional params
  const url = qs.stringifyUrl(
    {
      url: `${BASE_URL}/${endpoint}`,
      query: params,
    },
    { skipEmptyString: true, skipNull: true }
  ); // optional

  // making a call to URL
  // fetch and then pass a few headers

  console.log("Fetching URL:", url);

  const response = await fetch(url, {
    // need headers to make a valid request
    headers: {
      "x-cg-demo-api-key": API_KEY,
      "Content-Type": "application/json",
    } as Record<string, string>,
    next: { revalidate },
  });
  // checking if the response went through

  if (!response.ok) {
    //const errorBody: CoinGeckoErrorBody = await response.json().catch(() => ({})); // attach catch that returns some information
    //throw new Error(`API Error: ${response.status}: ${errorBody.error || response.statusText}`);

    const rawText = await response.text();
    console.log("CoinGecko error response:", rawText);
    throw new Error(
      `API Error: ${response.status}: ${rawText || response.statusText}`
    );
  }

  return response.json();
}
