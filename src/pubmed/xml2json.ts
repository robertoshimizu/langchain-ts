/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { parseStringPromise } from 'xml2js' // Assuming xml2js is installed

export async function xmlToJson (xml: string): Promise<any> {
  try {
    const result = await parseStringPromise(xml, { explicitArray: false })
    const article = result.PubmedArticleSet.PubmedArticle
    const medlineCitation = article.MedlineCitation
    const articleInfo = medlineCitation.Article
    const journalInfo = articleInfo.Journal
    const pubmedData = article.PubmedData

    const abstractTexts = articleInfo.Abstract.AbstractText
    // Ensure abstractTexts is treated as an array
    const abstractsArray = Array.isArray(abstractTexts) ? abstractTexts : [abstractTexts]

    const json = {
      articleTitle: articleInfo.ArticleTitle,
      listAuthors: Array.isArray(articleInfo.AuthorList.Author)
        ? articleInfo.AuthorList.Author.map((author: any) => ({
          lastName: author.LastName,
          foreName: author.ForeName,
          initials: author.Initials,
          affiliation: author.AffiliationInfo ? author.AffiliationInfo.Affiliation : null
        }))
        : [{
            lastName: articleInfo.AuthorList.Author.LastName,
            foreName: articleInfo.AuthorList.Author.ForeName,
            initials: articleInfo.AuthorList.Author.Initials,
            affiliation: articleInfo.AuthorList.Author.AffiliationInfo ? articleInfo.AuthorList.Author.AffiliationInfo.Affiliation : null
          }],
      typeOfArticle: Array.isArray(articleInfo.PublicationTypeList.PublicationType) ? articleInfo.PublicationTypeList.PublicationType.map((type: any) => type._) : [articleInfo.PublicationTypeList.PublicationType._],
      publicationOrJournal: {
        title: journalInfo.Title,
        isoAbbreviation: journalInfo.ISOAbbreviation,
        issn: journalInfo.ISSN._,
        volume: journalInfo.JournalIssue.Volume,
        issue: journalInfo.JournalIssue.Issue,
        pubDate: journalInfo.JournalIssue.PubDate,
        medlineTA: medlineCitation.MedlineJournalInfo.MedlineTA,
        country: medlineCitation.MedlineJournalInfo.Country,
        nlmUniqueId: medlineCitation.MedlineJournalInfo.NlmUniqueID,
        issnLinking: medlineCitation.MedlineJournalInfo.ISSNLinking
      },
      dateOfPublication: `${journalInfo.JournalIssue.PubDate.Year}-${journalInfo.JournalIssue.PubDate.Month}`,
      linksAndIdentifiers: {
        pubMedId: medlineCitation.PMID._,
        doi: articleInfo.ELocationID.find((e: { EIdType: string }) => e.EIdType === 'doi')?._,
        pii: articleInfo.ELocationID.find((e: { EIdType: string }) => e.EIdType === 'pii')?._,
        pmc: pubmedData.ArticleIdList.ArticleId.find((id: any) => id.IdType === 'pmc')?._
      },
      contentOfAbstract: abstractsArray.map((text: any) => ({ label: text.Label, content: text._ ? text._ : text }))
    }

    return json
  } catch (error) {
    console.error('Error parsing XML to JSON:', error)
    throw error
  }
}
