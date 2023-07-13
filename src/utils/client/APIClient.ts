import { getSupabaseClient } from "./supabase";
import API from "../common/API";

const APIClient = new API(getSupabaseClient());

export default APIClient;
