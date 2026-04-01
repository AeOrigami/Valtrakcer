import time
import pymongo
from db import db
import random 
import tqdm

def generateRandomDateRange():
    start_date = "2025-07-27T00:00:00Z"
    end_date = "2026-03-10T23:59:59Z"
    start_timestamp = int(time.mktime(time.strptime(start_date, "%Y-%m-%dT%H:%M:%SZ")))
    end_timestamp = int(time.mktime(time.strptime(end_date, "%Y-%m-%dT%H:%M:%SZ")))
    random_start_timestamp = random.randint(start_timestamp, end_timestamp)
    random_end_timestamp = random.randint(random_start_timestamp, end_timestamp)
    random_start_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.localtime(random_start_timestamp))
    random_end_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.localtime(random_end_timestamp))
    return random_start_date, random_end_date


def benchmark(rounds,db=db()):
    l1=[]
    l2=[]
    for i in range (0,rounds):
        start_date, end_date = generateRandomDateRange()
        l1.append(start_date)
        l2.append(end_date)



    print ("===== BENCHMARKING WITHOUT INDEX =====")
    db.hideindex("matches", "data crescente")
    response=runloop(rounds, db, l1, l2)

    print ("===== BENCHMARKING WITH INDEX =====")
    db.enableindex("matches", "data crescente")
    response=runloop(rounds, db, l1, l2)


    return response    


def runloop(rounds, db, l1, l2):
    res=0
    total_docs=0
    for i in tqdm.tqdm(range(0, rounds), desc="Processing"):
        start_date = l1[i]
        end_date = l2[i]

        start_time = time.time_ns()
        response=db.getmatchesbtwdates(start_date, end_date)
        end_time = time.time_ns()
        elapsed_time = end_time - start_time
        res+=elapsed_time
        
        response=list(response)
        
        
        total_docs += len(response)
    print(f"time for {rounds} rounds: {res/1e9} s")
    print(f"total docs returned: {total_docs}")
    return response

        


if __name__== "__main__":
    _ = benchmark(1000)
    _ = benchmark(5000)
    _ = benchmark(10000)
    _ = benchmark(15000)
    _ = benchmark(20000)
    _ = benchmark(25000)
    _ = benchmark(30000)
'''    
       ======= BENCHMARK RESULTS (using tqdm times) =======
 | Rounds | Time without Index | Time with Index    | improvement |
 |--------|--------------------|--------------------|-------------|
 | 1000   | 00:33 (30.20it/s)  | 00:09 (107.74it/s) |    3.7x     |
 | 5000   | 02:41 (30.97it/s)  | 00:42 (118.89it/s) |    3.8x     |
 | 10000  | 05:29 (30.37it/s)  | 01:32 (108.55it/s) |    3.5x     |
 | 15000  | 08:07 (30.74it/s)  | 02:04 (120.61it/s) |    3.9x     |
 | 20000  | 11:11 (29.78it/s)  | 03:02 (109.53it/s) |    3.7x     |
 | 25000  | 13:38 (30.55it/s)  | 03:34 (116.36it/s) |    3.8x     |  
 | 30000  | 16:32 (30.23it/s)  | 04:31 (110.61it/s) |    3.6x     |  
 '''