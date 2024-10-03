const core = require('@actions/core')
const github = require('@actions/github')

const validEvent = ['pull_request', 'merge_group']

async function main() {
  try {
    const { eventName, payload: {repository: repo, pull_request: pr} } = github.context

    if (validEvent.indexOf(eventName) < 0) {
      core.error(`Invalid event: ${eventName}`)
      return
    }

    const token = core.getInput('token')
    const octokit = github.getOctokit(token)

    const commitsListed = await octokit.rest.pulls.listCommits({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: pr.number,
    })

    let commits = commitsListed.data

    let fullCommits = []
    let commitsWordsOnly = []

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i]
      const commitDetails = await octokit.rest.repos.getCommit({
        owner: repo.owner.login,
        repo: repo.name,
        ref: commit.sha,
        mediaType: {
          format: 'diff'
        }
      })

      const commitData = commitDetails.data

      // Skip any commits having anything to do with workflows
      if (commitData.indexOf('/.github/workflows') > -1) {
        continue
      }

      fullCommits.push(commitData);

      // For bash-safe grep, we will remove any special characters and newlines
      let commitWordsOnly = commitData.replace(/\\n/gi, "");
      commitWordsOnly = commitData.replace(/[^a-zA-Z0-9_,: -]/g, ' ');
      commitsWordsOnly.push(commitWordsOnly);
    }

    core.setOutput('commit_words', JSON.stringify(commitsWordsOnly))
    core.setOutput('commits', JSON.stringify(fullCommits))
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
