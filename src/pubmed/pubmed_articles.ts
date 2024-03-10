/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/naming-convention */
import dotenv from 'dotenv'
import { xmlToJson } from './xml2json'
dotenv.config()

function extractWebEnvAndQueryKey (xmlString: string) {
  const webEnvRegex = /<WebEnv>(.*?)<\/WebEnv>/
  const queryKeyRegex = /<QueryKey>(.*?)<\/QueryKey>/

  const webEnvMatch = xmlString.match(webEnvRegex)
  const queryKeyMatch = xmlString.match(queryKeyRegex)

  const webEnv = webEnvMatch ? webEnvMatch[1] : null
  const queryKey = queryKeyMatch ? queryKeyMatch[1] : null

  return { webEnv, queryKey }
}

export async function getMedicalArticles (
  nameOfTopic: any
) {
  // Localizar e apresentar até 10 dos artigos mais relevantes no PubMed sobre um tópico específico, enfatizando a relevância e clareza na apresentação dos resultados.
  // traduzir o nome do tópico para o inglês, de preferencia ja usando os termos MESH
  console.log('\n***************** Welcome to the pubMed Articles *****************\n')

  const medTerm = `${nameOfTopic}`
  console.log('medTerm', medTerm)

  try {
    console.log('PUBMED: **********************')
    // trazer os arquivos através da API no pubmed
    const db = 'pubmed'
    const retmax = 1// Total number of Docs from the input set to be retrieved, up to a maximum of 10,000.
    let retmode = 'xml' // Retrieval type. Determines the format of the returned output. The default value is ‘xml’ for ESummary XML, but ‘json’ is also supported to return output in JSON format.
    const mindate = '2000'
    const maxdate = '2024'
    const sort = 'relevance'
    const pubmed_key = process.env.PUBMED_API_KEY

    const term = `(${medTerm})+AND+(review[FILT]+OR+'systematic review'[FILT]+OR+'meta-analysis'[FILT]+OR+'guideline'[FILT])+AND+(freetext [FILT])`

    // // Assemble the eSearch URL
    const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
    let url = `${base}esearch.fcgi?db=${db}&term=${term}&usehistory=y&retmax=${retmax}&retmode=${retmode}&mindate=${mindate}&maxdate=${maxdate}&sort=${sort}&api_key=${pubmed_key}`

    const fetchResponse = await fetch(url)
    console.log('fetchResponse URL', url)
    if (!fetchResponse.ok) {
      const message = `An error has occured fething articles numbers: ${fetchResponse.status}`
      throw new Error(message)
    }
    const xmlString = await fetchResponse.text()
    // console.log('fetchResponse', text)
    const parameters = extractWebEnvAndQueryKey(xmlString)
    console.log(parameters)

    const rettype = 'abstract' // Retrieval type. This parameter specifies the record view returned, such as Abstract or MEDLINE from PubMed, or GenPept or FASTA from protein. Please see Table 1 for a full list of allowed values for each database.
    retmode = 'xml' // Retrieval mode. This parameter specifies the data format of the records returned, such as plain text, HMTL or XML. See Table 1 for a full list of allowed values for each database.

    url = `${base}efetch.fcgi?db=${db}&query_key=${parameters.queryKey}&WebEnv=${parameters.webEnv}&rettype=${rettype}&retmode=${retmode}&retmax=${retmax}&api_key=${pubmed_key}`

    const fetchArticles = await fetch(url)
    if (!fetchArticles.ok) {
      const message = `An error has occured fetching abstracts: ${fetchArticles.status}`
      throw new Error(message)
    }

    console.log('fetchArticles URL', url)

    const listOfArticles = await fetchArticles.text()

    console.log('PUBMED: **********************')

    // const prompt = ` Use the list of articles from pubmed that are between backticks to craft your response using the following guidelines:
    // •Identifies and presents the top 5 most relevant articles sorted by the most recent published date. Each selection has the following structure: Title (original language), Date of Publication, Name of the source of the publication, The comprehensive summary, The Clickable link (to open in another tab) for full access, ensuring you have quick access to high-quality research. It is mandatory to include these clickable links in your response.
    // •If the list of articles present less tha 5 articles, use it but change the title to reflect the number of articles. If the listOfArticles contain no articles. i.e., zero, communicate politely that \
    // no articles were found for the topic and suggest to redo the query.
    // •Offers a comprehensive summary of the scientific articles, focusing on key findings and study methodologies. Each summary should be comprehensive enough to provide clear and direct insights.
    // •Focus on English-Language Articles: Specializes in articles originally written in English to ensure access to high-quality and relevant studies. To be clear this response needs to be written in the idiom of the user (for axample Brazillian Portuguese), however the articles titles need to be kept in English.
    // •Multilingual with Original Titles in Bold: Delivers summaries in the user's query language, while retaining the original English titles in bold for reference.
    // •When selecting articles give priority on those that give assistance in Clinical Decision-Making and Research: Aids professionals in clinical decision-making and scientific research by emphasizing relevance.
    // •Integrate International Guidelines: Incorporates relevant international guidelines into the summaries for comprehensive understanding.
    // •Present the list under the title: Top 5 articles from PubMed about """${nameOfTopic}""" translated to native language of the user (example: Brazillian Portuguese).
    // •YOU MUST include at end of each summary the name of the source and full clickable url. For example """Available from: https://pubmed.ncbi.nlm.nih.gov/32698345/""" \
    //   EACH article has at the end the PMID number, for example "PMID: 27527755 [Indexed for MEDLINE]". The clickable link should use this PMID number and replace it PMID in the \
    //   url https://pubmed.ncbi.nlm.nih.gov/PMID/, using the earlier example, the url to show would be https://pubmed.ncbi.nlm.nih.gov/27527755/.

    // list of articles:
    // """
    // ${listOfArticles}
    // """
    // `
    console.log('************************************************')
    console.log('PubMed articles:', listOfArticles)
    console.log('************************************************')

    const jason = await xmlToJson(listOfArticles)
    console.log('jason', jason)

    return 'success'
  } catch (error) {
    console.log('error', error)

    return 'Houve um erro ao tentar obter os artigos médicos. Comunique ao usuário que a busca falhou e que ele deve tentar novamente mais tarde.'
  }
}
