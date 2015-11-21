/* globals Session, ReactMeteorData */

App.initialBatchSize = 48

var chunkSize = 24 // must be % 12 == 0, how many blocks are added
var blocksInAdvance = 6 // if the browser is this close to the bottom we will load more

if (typeof Session !== 'undefined') {
  Session.set('searchQuery', '')
  Session.set('lastResult', App.initialBatchSize)
}

if (Meteor.isClient) {
  var $window = $(window)
}

App.DappsList = React.createClass({
  // This mixin makes the getMeteorData method work
  mixins: [ReactMeteorData],
  // fields in mongo to use in search query
  searchFields: ['name', 'description', 'tags', 'contact'],
  // Loads items from the Dapps collection and puts them on this.data.dapps
  getMeteorData () {
    var data = {}
    var query = {}
    var sort = {'last_update': -1}
    var limit = App.initialBatchSize
    var searchQuery = ''
    // subscribe to the data source, server and client
    Meteor.subscribe('dapps')
    // CLIENT ONLY
    if (typeof Session !== 'undefined') {
      // Use the search query if one exists
      searchQuery = Session.get('searchQuery') || ''
      limit = Session.get('lastResult')
      // If the query is long enough, search regex pattern in all searchable fields
      if (searchQuery.length > 0) {
        query = {$or: []}
        for (var i = 0; i < this.searchFields.length; i++) {
          var thisField = {}
          thisField[this.searchFields[i]] = { $regex: searchQuery, $options: 'i' }
          query.$or.push(thisField)
        }
      }
    }
    data.dapps = App.cols.Dapps.find(query, { sort: sort, limit: limit }).fetch()
    return data
  },

  // infinite scrolling
  loadMoreItems () {
    var childCount = $('.col', this.refs.dappSection.getDOMNode()).size()
    var sessionGetLastResult = Session.get('lastResult')
    // don't try to load more items until we've matched the last request, or never fire if done
    if (childCount >= sessionGetLastResult) {
      Session.set('lastResult', sessionGetLastResult + chunkSize)
    }
  },

  handleScroll: _.debounce(function () {
    // get the position of `blocksInAdvance` blocks before it ends
    var $lastItem = $('.col:last-child', this.refs.dappSection.getDOMNode())
    var targetPosition = Math.round($lastItem.offset().top - ($lastItem.height() * blocksInAdvance))
    if ($window.scrollTop() + $window.height() >= targetPosition) {
      this.loadMoreItems()
    }
  }, 200),

  componentDidUpdate () {
    // check to see if screen is fully populated
    var $lastItem = $('.col:last-child', this.refs.dappSection.getDOMNode())
    if (Math.floor($lastItem.offset().top) + $lastItem.height() < $window.height()) {
      this.loadMoreItems()
    }
  },

  componentDidMount () {
    window.addEventListener('scroll', this.handleScroll)
    this.componentDidUpdate()
  },

  componentWillUnmount () {
    window.removeEventListener('scroll', this.handleScroll)
  },

  scrollToTop () {
    window.scrollTo(0, 0)
  },

  renderDapps () {
    if (this.data.dapps.length) {
      return this.data.dapps.map(dapp => {
        return <App.Dapp
          key={dapp._id}
          dapp={dapp} />
      })
    } else {
      return (
        <div className='no-results center-align white-text flow-text'>
          <p>No Dapps Found</p>
        </div>
      )
    }
  },

  render () {
    return (
      <div>
        <div onClick={this.scrollToTop} className='scroll-to-top'>
          <i className='fa fa-fw fa-arrow-up'></i>
        </div>
        <div ref='navArea' className='header-container container'>
          <header className='center-align'>
            <h1>State of the Ðapps</h1>
          </header>
          <section>
            < App.SearchBox />
          </section>
        </div>
        <section ref='dappSection' className='dapps section row black'>
          {this.renderDapps()}
        </section>
        <footer className='black white-text center-align'>
          <div className='row'>
            <div className='col s12 m4'>
              Service by <a target='_blank' href='http://ethercasts.com/'>ethercasts</a>
            </div>
            <div className='col s12 m4'>
              UI by <a target='_blank' href='http://hitchcott.com'>hitchcott</a>
            </div>
            <div className='col s12 m4'>
              Fork me on <a target='_blank' href='https://github.com/EtherCasts/state-of-the-dapps'><i className='fa fa-fw fa-github'></i>GitHub</a>
            </div>
          </div>
        </footer>
        < App.SubmitModal />
      </div>
    )
  }
})

