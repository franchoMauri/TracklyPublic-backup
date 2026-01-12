import { httpsCallable } from "firebase/functions";
import { functions } from "/src/services/firebase.js";

const getJiraIssuesFn = httpsCallable(functions, "getJiraIssues");

export const getJiraIssues = async () => {
  const res = await getJiraIssuesFn();
  return res.data || [];
};
