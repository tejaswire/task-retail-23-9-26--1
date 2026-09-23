##verisions
main-4.2.0---main code
develop branch--feature1,feature2 --
again created new branch like(release/4.3.0) ---pushed develop branch code with f1,f2 changes  to  release/4.3.0
created hotfix/payment-4.2.1(here payment fix did)
now this hotfix/payment-4.2.1 is mearged to main(changes should happen there)------v4.2.1(it is tagged as v4.2.1)
Again this hotfix/payment-4.2.1 is mearged to develop(because developers have to know the changes in code)
jenkins-pipeline
retail-app:4.2.1
start new container
for this container Health check is done(because only healthy 
                   -------------
container should start, broken container should not start).

health check Healthy(yes)-remove old version-Deployment SUCCESS
             Failed(no)-Rollback old version---Restore 4.2.1---Final jenkins FAILURES

extra internal conflict:
Production version: 4.2.1